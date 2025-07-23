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