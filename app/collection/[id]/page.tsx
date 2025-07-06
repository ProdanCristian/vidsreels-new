"use client"

import { useParams } from "next/navigation"
import { useState } from "react"
import DashboardHeader from "@/components/dashboard-header"
import TikTokView from "@/components/video-views/tiktok-view"
import GridView from "@/components/video-views/grid-view"
import { Button } from "@/components/ui/button"
import { LayoutGrid, Layers, Shuffle } from "lucide-react"
import useSWR from 'swr'

interface FastVideo {
  id: string
  name: string
  size: string
  streamUrl: string
  directUrl: string
  embedUrl: string
  thumbnailUrl: string
  hlsManifestUrl?: string
  hlsAvailable?: boolean
  streamingType?: 'mp4' | 'hls'
  lastModified: Date
}

interface VideoResponse {
  videos: FastVideo[]
  hasMore: boolean
  totalCount: number
  page: number
  limit: number
  nextToken?: string
}

// No transformation needed - API returns correct format for GridView

export default function CollectionPage() {
  const params = useParams()
  const collectionId = params.id as string
  const [currentView, setCurrentView] = useState<'tiktok' | 'grid'>('tiktok')
  const [currentPage, setCurrentPage] = useState(1)
  const [isShuffled, setIsShuffled] = useState(false)

  // Fetcher function for SWR
  const fetcher = async (url: string): Promise<VideoResponse> => {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch videos: ${response.statusText}`)
    }
    return response.json()
  }

  // Fetch data for grid view
  const { data: gridData, isLoading: gridLoading } = useSWR<VideoResponse>(
    collectionId && currentView === 'grid' ? `/api/videos/${collectionId}?page=${currentPage}&limit=12&shuffle=${isShuffled}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  )

  // Handle video download
  const handleVideoDownload = async (videoUrl: string, filename: string) => {
    try {
      const response = await fetch(videoUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  // Handle page change for grid view
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Toggle shuffle and reset to page 1
  const toggleShuffle = () => {
    setIsShuffled(!isShuffled)
    setCurrentPage(1)
  }

  // Don't render views until we have the collection ID
  if (!collectionId) {
    return (
      <div className="min-h-screen bg-black">
        <DashboardHeader />
        <div className="h-screen flex items-center justify-center pt-20 sm:pt-24">
          <div className="text-center p-8">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          </div>
        </div>
      </div>
    )
  }

  // Prepare collection data for grid view
  const gridCollection = gridData ? {
    id: collectionId,
    name: 'Collection',
    videos: gridData.videos, // Use videos directly - no transformation needed
    totalVideos: gridData.totalCount,
    hasMore: gridData.hasMore,
    totalPages: Math.ceil(gridData.totalCount / 12),
    currentPage: gridData.page
  } : null

  const totalPages = gridCollection?.totalPages || 1

  return (
    <div className="min-h-screen bg-black">
      <DashboardHeader />
      
      {/* View Toggle */}
      <div className="fixed top-24 sm:top-28 left-1/2 transform -translate-x-1/2 z-40">
        <div className="flex bg-black/70 backdrop-blur-md rounded-full border border-white/10 p-0.5 shadow-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView('tiktok')}
            className={`cursor-pointer rounded-full w-8 h-8 p-0 transition-all duration-200 ${
              currentView === 'tiktok' 
                ? 'bg-white text-black shadow-sm' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Layers className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView('grid')}
            className={`rounded-full w-8 h-8 p-0 transition-all duration-200 ${
              currentView === 'grid' 
                ? 'bg-white text-black shadow-sm' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          {/* Divider */}
          <div className="w-px h-5 my-auto bg-white/10 mx-1"></div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleShuffle}
            className={`rounded-full w-8 h-8 p-0 transition-all duration-200 ${
              isShuffled 
                ? 'bg-blue-500 text-white shadow-sm' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Render appropriate view */}
      {currentView === 'tiktok' ? (
      <TikTokView
        collectionId={collectionId}
        onVideoDownload={handleVideoDownload}
          isShuffled={isShuffled}
        />
      ) : (
        <GridView
          videos={gridCollection?.videos || []}
          currentPage={currentPage}
          totalPages={totalPages}
          loadingMore={gridLoading}
          onPageChange={handlePageChange}
          onVideoDownload={handleVideoDownload}
      />
      )}
    </div>
  )
} 