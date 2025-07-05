import { NextRequest, NextResponse } from 'next/server'
import { S3Client, ListObjectsV2Command, ListObjectsV2CommandOutput } from '@aws-sdk/client-s3'
import { VideoFile } from '@/types/video'
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
  // Encode each part of the S3 key, preserving slashes
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

async function getVideosFromDatabase(collectionId: string): Promise<VideoFile[]> {
  const whereClause = collectionId === 'all' ? {} : { collection: collectionId }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videos = await (prisma as any).video.findMany({
    where: whereClause,
    orderBy: { lastModified: 'desc' }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return videos.map((video: any) => {
    // Extract filename from S3 key for display
    const fileName = video.s3Key.split('/').pop() || video.s3Key
    const encodedKey = encodeS3Key(video.s3Key)
    
    return {
      id: video.s3Key,
      name: fileName,
      size: video.size,
      streamUrl: video.streamUrl,
      directUrl: `https://${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${encodedKey}`,
      embedUrl: video.streamUrl,
      thumbnailUrl: video.thumbnailUrl,
      lastModified: video.lastModified,
    }
  })
}

async function syncVideosFromR2ToDatabase(forceSync: boolean = false): Promise<void> {
  // Check if we need to sync (only sync if database is empty or force sync)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videoCount = await (prisma as any).video.count()
  
  if (videoCount > 0 && !forceSync) {
    console.log(`📊 Database has ${videoCount} videos, skipping sync`)
    return
  }

  console.log(`🔄 Syncing videos from R2 to database...`)
  const allVideos: { s3Key: string; size: string; streamUrl: string; thumbnailUrl: string | null; collection: string; lastModified: Date }[] = []
  let continuationToken: string | undefined = undefined

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

  // Save videos to database using upsert to handle duplicates
  console.log(`💾 Saving ${allVideos.length} videos to database...`)
  
  for (const video of allVideos) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).video.upsert({
      where: { s3Key: video.s3Key },
      update: {
        size: video.size,
        streamUrl: video.streamUrl,
        thumbnailUrl: video.thumbnailUrl,
        collection: video.collection,
        lastModified: video.lastModified,
      },
      create: video,
    })
  }

  console.log(`✅ Successfully synced ${allVideos.length} videos to database`)
}

async function getCollectionVideos(collectionId: string): Promise<VideoFile[]> {
  // First, try to get videos from database
  const dbVideos = await getVideosFromDatabase(collectionId)
  
  // If database is empty, sync from R2
  if (dbVideos.length === 0) {
    await syncVideosFromR2ToDatabase()
    return await getVideosFromDatabase(collectionId)
  }
  
  return dbVideos
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const shuffle = searchParams.get('shuffle') === 'true'
    const forceSync = searchParams.get('sync') === 'true'
    const { collectionId } = await params

    console.log(`🎬 Request for collection: ${collectionId}, page: ${page}, limit: ${limit}, shuffle: ${shuffle}, forceSync: ${forceSync}`)

    // If forceSync is requested, sync from R2
    if (forceSync) {
      await syncVideosFromR2ToDatabase(true)
    }

    const allVideos = await getCollectionVideos(collectionId)

    // Create a copy before sorting/shuffling to not mutate the original array
    const processedVideos = [...allVideos]
    
    // Sort or shuffle the entire list
    if (shuffle) {
      for (let i = processedVideos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [processedVideos[i], processedVideos[j]] = [processedVideos[j], processedVideos[i]];
      }
    } else {
      processedVideos.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
    }

    // Apply pagination
    const totalCount = processedVideos.length
    const startIndex = (page - 1) * limit
    const paginatedVideos = processedVideos.slice(startIndex, startIndex + limit)
    const hasMore = startIndex + limit < totalCount

    console.log(`✅ Found ${totalCount} total videos from database. Returning ${paginatedVideos.length} for page ${page}. Has more: ${hasMore}`)

    return NextResponse.json({
      videos: paginatedVideos,
      hasMore,
      totalCount,
      page,
      limit,
      source: 'database',
      nextToken: undefined 
    })

  } catch (error) {
    console.error('❌ API Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch videos',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 