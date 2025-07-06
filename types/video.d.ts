export interface VideoFile {
  id: string
  name: string
  size: string
  streamUrl: string
  directUrl: string
  embedUrl: string
  thumbnailUrl: string
  hlsManifestUrl?: string
  hlsAvailable: boolean
  streamingType: 'mp4' | 'hls'
  lastModified: Date
}

export interface VideoResponse {
  videos: VideoFile[]
  hasMore: boolean
  totalCount: number
  page: number
  limit: number
  nextToken?: string
  source?: string
  performance?: {
    directR2: boolean
    storedUrls: boolean
    mp4Only: boolean
    ultraFast: boolean
  }
} 