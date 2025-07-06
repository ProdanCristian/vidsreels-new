import { NextRequest, NextResponse } from 'next/server'
import { VideoFile } from '@/types/video'
import { prisma } from '@/lib/prisma'

const CACHE_TTL = 300 // 5 minutes cache for video lists
const MAX_BATCH_SIZE = 50 // Maximum videos per batch for optimal performance

/**
 * Get videos from LuxuryVideos table using stored URLs
 */
async function getVideosFromDatabase(page: number, limit: number, shuffle: boolean): Promise<{
  videos: VideoFile[]
  totalCount: number
  hasMore: boolean
}> {
  try {
    console.log(`🔍 Fetching videos: page=${page}, limit=${limit}, shuffle=${shuffle}`)
    
    // Get total count efficiently
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalCount = await (prisma as any).luxuryVideos.count()
    console.log(`📊 Total videos in database: ${totalCount}`)
    
    // Optimize query based on shuffle requirement
    let videos
    if (shuffle) {
      // For shuffle, get more records and shuffle them
      const shuffleLimit = Math.min(1000, limit * 10) // Get up to 10x records for better shuffle
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shuffleVideos = await (prisma as any).luxuryVideos.findMany({
        take: shuffleLimit,
        orderBy: { id: 'desc' },
      })
      
      // Shuffle the results
      for (let i = shuffleVideos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffleVideos[i], shuffleVideos[j]] = [shuffleVideos[j], shuffleVideos[i]];
      }
      
      // Apply pagination to shuffled results
      const startIndex = (page - 1) * limit
      videos = shuffleVideos.slice(startIndex, startIndex + limit)
    } else {
      // Standard pagination for non-shuffle requests
      const offset = (page - 1) * limit
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      videos = await (prisma as any).luxuryVideos.findMany({
        orderBy: { id: 'desc' },
        skip: offset,
        take: limit,
      })
    }

    console.log(`✅ Found ${videos.length} videos from database`)

    // Convert to VideoFile format using stored URLs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const optimizedVideos: VideoFile[] = videos.map((video: any) => {
      // Extract filename from s3Key for display
      const filename = video.s3Key.split('/').pop() || video.s3Key
      
      console.log(`🎬 Processing video: ${video.s3Key}`)
      console.log(`   Video URL: ${video.videoUrl}`)
      console.log(`   Thumbnail: ${video.thumbnailUrl}`)
      
      return {
        id: video.s3Key,
        name: filename,
        size: '0 MB', // Size not stored in simple table
        
        // Use stored URLs from database
        streamUrl: video.videoUrl,      // Use stored video URL
        directUrl: video.videoUrl,      // Direct video URL
        embedUrl: video.videoUrl,       // Use video URL for embed
        thumbnailUrl: video.thumbnailUrl,
        
        // MP4-only support - HLS removed for simplicity and performance
        hlsManifestUrl: undefined,
        hlsAvailable: false,
        streamingType: 'mp4' as 'mp4' | 'hls',
        
        lastModified: new Date(), // Default to current date
      }
    })

    const hasMore = shuffle 
      ? totalCount > 1000 // For shuffle, conservative estimate
      : (page * limit) < totalCount

    console.log(`🚀 Returning ${optimizedVideos.length} videos, hasMore=${hasMore}`)

    return {
      videos: optimizedVideos,
      totalCount,
      hasMore
    }
  } catch (error) {
    console.error('❌ Database query error:', error)
    throw error
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(MAX_BATCH_SIZE, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const shuffle = searchParams.get('shuffle') === 'true'
    const { collectionId } = await params

    console.log(`🎬 API request: collection=${collectionId}, page=${page}, limit=${limit}, shuffle=${shuffle}`)

    // Get videos using stored URLs
    const result = await getVideosFromDatabase(page, limit, shuffle)

    console.log(`✅ API response: ${result.videos.length} videos, hasMore=${result.hasMore}, total=${result.totalCount}`)

    // Add performance headers
    const response = NextResponse.json({
      videos: result.videos,
      hasMore: result.hasMore,
      totalCount: result.totalCount,
      page,
      limit,
      source: 'luxuryvideos-stored-urls',
      performance: {
        directR2: true,
        storedUrls: true,
        mp4Only: true,
        ultraFast: true
      }
    })

    // Cache headers for better performance
    response.headers.set('Cache-Control', `public, s-maxage=${CACHE_TTL}, stale-while-revalidate`)
    response.headers.set('X-Performance-Mode', 'luxuryvideos-stored-urls')
    response.headers.set('X-URL-Source', 'database-stored')
    
    return response

  } catch (error) {
    console.error('❌ API Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch luxury videos',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 