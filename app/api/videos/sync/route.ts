import { NextRequest, NextResponse } from 'next/server'
import { S3Client, ListObjectsV2Command, ListObjectsV2CommandOutput } from '@aws-sdk/client-s3'
import { prisma } from '@/lib/prisma'

// Configure S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET!

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function encodeS3Key(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/')
}

function isVideoFile(filename: string): boolean {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.3gp', '.flv']
  return videoExtensions.some(ext => filename.toLowerCase().endsWith(ext))
}

function generateThumbnailUrl(s3Key: string): string | null {
  // Generate thumbnail URL using webp format with same base filename
  const fileName = s3Key.split('/').pop() || s3Key
  const baseName = fileName.split('.').slice(0, -1).join('.')
  
  // Return video-proxy URL for webp thumbnail
  return `/api/video-proxy/${encodeURIComponent(baseName)}.webp`
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clearExisting = searchParams.get('clear') === 'true'
    
    console.log(`🔄 Starting video sync from R2 to database (clear existing: ${clearExisting})`)
    
    // Clear existing videos if requested
    if (clearExisting) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).video.deleteMany({})
      console.log('🗑️ Cleared existing videos from database')
    }
    
    const allVideos: { s3Key: string; size: string; streamUrl: string; thumbnailUrl: string | null; collection: string; lastModified: Date }[] = []
    let continuationToken: string | undefined = undefined
    
    // Fetch all videos from R2
    do {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      })
      const response: ListObjectsV2CommandOutput = await s3Client.send(command)
      
      if (response.Contents) {
        for (const object of response.Contents) {
          if (!object.Key || !isVideoFile(object.Key)) continue

          const encodedKey = encodeS3Key(object.Key)
          const streamUrl = `/api/video-proxy/${encodedKey}`
          
          // Use bucket name as collection
          const collection = BUCKET_NAME
          
          // Generate thumbnail URL based on video URL
          const thumbnailUrl = generateThumbnailUrl(object.Key)
          
          allVideos.push({
            s3Key: object.Key,
            size: formatFileSize(object.Size || 0),
            streamUrl,
            thumbnailUrl,
            collection,
            lastModified: object.LastModified || new Date(),
          })
        }
      }
      continuationToken = response.NextContinuationToken
    } while (continuationToken)

    // Save videos to database
    console.log(`💾 Saving ${allVideos.length} videos to database...`)
    
    let savedCount = 0
    
    // Use createMany for bulk insert (more efficient and prevents duplicates)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (prisma as any).video.createMany({
      data: allVideos,
      skipDuplicates: true
    })
    
    savedCount = result.count

    console.log(`✅ Sync completed: ${savedCount} new videos saved`)

    return NextResponse.json({
      success: true,
      message: 'Video sync completed successfully',
      stats: {
        total: allVideos.length,
        saved: savedCount,
        cleared: clearExisting
      }
    })

  } catch (error) {
    console.error('❌ Sync Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to sync videos',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 