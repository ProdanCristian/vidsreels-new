import { VideoFile } from '@/types/video';

// In-memory cache for video lists to prevent re-fetching from R2 on every request
// This is defined in a separate module to persist across hot-reloads in development
const videoCache = new Map<string, { videos: VideoFile[]; timestamp: number }>()
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour in milliseconds

export function getCachedVideos(collectionId: string): VideoFile[] | null {
  const cachedData = videoCache.get(collectionId)
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    console.log(`🚀 Using cached video list for collection: ${collectionId}`)
    return cachedData.videos
  }
  return null
}

export function setCachedVideos(collectionId: string, videos: VideoFile[]) {
  console.log(`✅ Caching video list for collection: ${collectionId}`)
  videoCache.set(collectionId, { videos, timestamp: Date.now() })
} 