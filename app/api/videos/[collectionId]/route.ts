import { NextRequest, NextResponse } from 'next/server'
import { S3Client, ListObjectsV2Command, ListObjectsV2CommandOutput } from '@aws-sdk/client-s3'
import { getCachedVideos, setCachedVideos } from '@/lib/video-cache'
import { VideoFile } from '@/types/video'

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

async function getCollectionVideos(collectionId: string): Promise<VideoFile[]> {
  const cachedVideos = getCachedVideos(collectionId)
  if (cachedVideos) {
    return cachedVideos
  }

  console.log(`🔍 Fetching fresh video list from R2 for collection: ${collectionId}`)
  const allVideos: VideoFile[] = []
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
        if (collectionId !== 'all' && !object.Key.toLowerCase().includes(collectionId.toLowerCase())) continue

      const fileName = object.Key.split('/').pop() || object.Key
        const encodedKey = encodeS3Key(object.Key)
        const streamUrl = `/api/video-proxy/${encodedKey}`
        
        allVideos.push({
          id: object.Key,
          name: fileName,
          size: formatFileSize(object.Size || 0),
          streamUrl,
          directUrl: `https://${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${encodedKey}`,
          embedUrl: streamUrl,
          thumbnailUrl: null,
          lastModified: object.LastModified || new Date(),
        })
      }
    }
    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  setCachedVideos(collectionId, allVideos)
  return allVideos
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
    const { collectionId } = await params

    console.log(`🎬 Request for collection: ${collectionId}, page: ${page}, limit: ${limit}, shuffle: ${shuffle}`)

    const allVideos = await getCollectionVideos(collectionId)

    // Create a copy before sorting/shuffling to not mutate the cache
    const processedVideos = [...allVideos]
    
    // Now that we have all videos, we can sort or shuffle the entire list
    if (shuffle) {
      for (let i = processedVideos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [processedVideos[i], processedVideos[j]] = [processedVideos[j], processedVideos[i]];
      }
    } else {
      processedVideos.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
    }

    // Then, apply pagination
    const totalCount = processedVideos.length
    const startIndex = (page - 1) * limit
    const paginatedVideos = processedVideos.slice(startIndex, startIndex + limit)
    const hasMore = startIndex + limit < totalCount

    console.log(`✅ Found ${totalCount} total videos. Returning ${paginatedVideos.length} for page ${page}. Has more: ${hasMore}`)

    return NextResponse.json({
      videos: paginatedVideos,
      hasMore,
      totalCount,
      page,
      limit,
      // nextToken is no longer needed for page-based pagination
      nextToken: undefined 
    })

  } catch (error) {
    console.error('❌ R2 API Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch videos from R2',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 