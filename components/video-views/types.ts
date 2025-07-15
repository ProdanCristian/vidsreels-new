export interface FastVideo {
  id: string
  name: string
  directUrl: string
  thumbnailUrl?: string
}

export interface VideoResponse {
  videos: FastVideo[]
  hasMore: boolean
  page: number
}

export interface TikTokViewProps {
  collectionId: string
  onVideoDownload: (videoUrl: string, filename: string) => void
  isShuffled: boolean
} 