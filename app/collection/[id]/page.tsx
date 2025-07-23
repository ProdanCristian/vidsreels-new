"use client"

import { useParams } from "next/navigation"
import { useState, useEffect } from "react"
import DashboardHeader from "@/components/dashboard-header"
import GridView from "@/components/video-views/grid-view"
import useSWR, { mutate } from 'swr'

interface FastVideo {
  id: string
  s3Key: string
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
  message?: string
}

export default function CollectionPage() {
  const params = useParams()
  const collectionId = params.id as string
  const [currentPage, setCurrentPage] = useState(1)
  const [videos, setVideos] = useState<FastVideo[]>([])

  const swrKey = collectionId ? `/api/videos/${collectionId}?page=${currentPage}&limit=12` : null

  const fetcher = async (url: string): Promise<VideoResponse> => {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch videos: ${response.statusText}`)
    }
    return response.json()
  }

  const { data: gridData, isLoading: gridLoading } = useSWR<VideoResponse>(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  )
  
  useEffect(() => {
    if (gridData?.videos) {
      setVideos(gridData.videos)
    }
  }, [gridData])


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

  const handleVideoDelete = async (videoId: string) => {
    // Optimistically remove the video from the UI
    setVideos(prev => prev.filter(v => v.id !== videoId));

    try {
      const response = await fetch(`/api/videos/${collectionId}?videoId=${videoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete video. Restoring UI.');
      }
      
      // Revalidate the SWR cache to get fresh data
      mutate(swrKey);

    } catch (error) {
      console.error('Delete failed:', error);
      // If the delete fails, re-fetch the data to restore the video list
      mutate(swrKey);
    }
  };


  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

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

  const totalPages = gridData ? Math.ceil(gridData.totalCount / 12) : 1

  // Check if this is an empty collection with a coming soon message
  const isComingSoon = gridData && gridData.totalCount === 0 && gridData.message

  return (
    <div className="min-h-screen bg-black">
      <DashboardHeader />
      
      {isComingSoon ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 sm:pt-24">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-4 capitalize">
                {collectionId} Collection
              </h2>
              <p className="text-lg text-white/80 mb-2">
                {gridData.message}
              </p>
                             <p className="text-sm text-white/60 max-w-md">
                 We&apos;re working hard to bring you amazing {collectionId} videos. Check back soon for new content!
               </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => window.history.back()}
                className="px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full font-medium text-white border border-white/30 hover:bg-white/30 hover:border-white/50 transition-all duration-200"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      ) : (
        <GridView
          videos={videos}
          currentPage={currentPage}
          totalPages={totalPages}
          loadingMore={gridLoading}
          onPageChange={handlePageChange}
          onVideoDownload={handleVideoDownload}
          onVideoDelete={handleVideoDelete}
        />
      )}
    </div>
  )
} 