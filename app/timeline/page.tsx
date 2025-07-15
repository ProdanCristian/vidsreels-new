"use client"

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { FastVideo, VideoResponse } from '../../components/video-views/types'
import { Button } from '../../components/ui/button'
import LoadingSpinner from '../../components/video-views/loading-spinner'

// Thumbnail placeholder component
const ThumbnailPlaceholder = ({ className }: { className?: string }) => (
  <div className={`bg-gray-800 flex items-center justify-center ${className}`}>
    <div className="text-gray-400 text-xs">Loading...</div>
  </div>
)

interface TimelineVideo extends FastVideo {
  timelinePosition: number
}

export default function TimelinePage() {
  const [selectedCollection, setSelectedCollection] = useState<string>('')
  const [allVideos, setAllVideos] = useState<FastVideo[]>([])
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set())
  const [timeline, setTimeline] = useState<TimelineVideo[]>([])
  const [draggedVideo, setDraggedVideo] = useState<FastVideo | null>(null)
  const [loadedThumbnails, setLoadedThumbnails] = useState<Set<string>>(new Set())

  const fetcher = async (url: string): Promise<VideoResponse> => {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch videos: ${response.statusText}`)
    return response.json()
  }

  const { data, isLoading } = useSWR<VideoResponse>(
    selectedCollection ? `/api/videos/${selectedCollection}?page=1&limit=50&shuffle=false` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  useEffect(() => {
    if (data?.videos) {
      setAllVideos(data.videos)
      setLoadedThumbnails(new Set()) // Reset thumbnail loading state for new videos
    }
  }, [data])

  const handleVideoSelect = (video: FastVideo) => {
    setSelectedVideos(prev => {
      const newSet = new Set(prev)
      if (newSet.has(video.id)) {
        newSet.delete(video.id)
        setTimeline(prev => prev.filter(v => v.id !== video.id))
      } else {
        newSet.add(video.id)
      }
      return newSet
    })
  }

  const addToTimeline = (video: FastVideo) => {
    if (!timeline.find(v => v.id === video.id)) {
      const timelineVideo: TimelineVideo = {
        ...video,
        timelinePosition: timeline.length
      }
      setTimeline(prev => [...prev, timelineVideo])
      setSelectedVideos(prev => new Set(prev).add(video.id))
    }
  }

  const removeFromTimeline = (videoId: string) => {
    setTimeline(prev => prev.filter(v => v.id !== videoId))
    setSelectedVideos(prev => {
      const newSet = new Set(prev)
      newSet.delete(videoId)
      return newSet
    })
  }

  const reorderTimeline = (fromIndex: number, toIndex: number) => {
    setTimeline(prev => {
      const newTimeline = [...prev]
      const [movedItem] = newTimeline.splice(fromIndex, 1)
      newTimeline.splice(toIndex, 0, movedItem)
      return newTimeline.map((video, index) => ({
        ...video,
        timelinePosition: index
      }))
    })
  }

  const handleDragStart = (e: React.DragEvent, video: FastVideo) => {
    setDraggedVideo(video)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dropIndex?: number) => {
    e.preventDefault()
    
    if (draggedVideo) {
      if (dropIndex !== undefined) {
        const existingIndex = timeline.findIndex(v => v.id === draggedVideo.id)
        if (existingIndex !== -1) {
          reorderTimeline(existingIndex, dropIndex)
        } else {
          const timelineVideo: TimelineVideo = {
            ...draggedVideo,
            timelinePosition: dropIndex
          }
          setTimeline(prev => {
            const newTimeline = [...prev]
            newTimeline.splice(dropIndex, 0, timelineVideo)
            return newTimeline.map((video, index) => ({
              ...video,
              timelinePosition: index
            }))
          })
          setSelectedVideos(prev => new Set(prev).add(draggedVideo.id))
        }
      } else {
        addToTimeline(draggedVideo)
      }
    }
    setDraggedVideo(null)
  }

  const clearTimeline = () => {
    setTimeline([])
    setSelectedVideos(new Set())
  }

  // Mock collection IDs - in real app, these would come from your collections
  const availableCollections = ['collection1', 'collection2', 'collection3']

  return (
    <div className="fixed top-16 sm:top-20 left-0 right-0 bottom-0 bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-80 backdrop-blur-sm border-b border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold">Timeline Editor</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{timeline.length} videos</span>
            {timeline.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={clearTimeline}
                className="bg-red-600 hover:bg-red-700"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Collection Selector */}
      <div className="absolute top-14 left-0 right-0 z-10 bg-black bg-opacity-80 backdrop-blur-sm border-b border-gray-800">
        <div className="flex gap-2 px-4 py-2 overflow-x-auto">
          {availableCollections.map(collectionId => (
            <Button
              key={collectionId}
              variant={selectedCollection === collectionId ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCollection(collectionId)}
              className={`flex-shrink-0 ${
                selectedCollection === collectionId 
                  ? 'bg-white text-black hover:bg-gray-200' 
                  : 'bg-transparent border-gray-600 text-white hover:bg-gray-800'
              }`}
            >
              {collectionId}
            </Button>
          ))}
        </div>
      </div>

      {/* Timeline Area */}
      <div className="absolute top-28 left-0 right-0 z-10 bg-black bg-opacity-90 backdrop-blur-sm border-b border-gray-800">
        <div 
          className="px-4 py-3 flex gap-2 overflow-x-auto min-h-20"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e)}
        >
          {timeline.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
              Drag videos here to create timeline
            </div>
          ) : (
            timeline.map((video, index) => (
              <div
                key={video.id}
                className="flex-shrink-0 w-12 h-16 bg-gray-900 rounded-lg overflow-hidden cursor-move relative group border border-gray-700"
                draggable
                onDragStart={(e) => handleDragStart(e, video)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
              >
                {!loadedThumbnails.has(video.id) && (
                  <ThumbnailPlaceholder className="absolute inset-0" />
                )}
                <img
                  src={video.thumbnailUrl || video.directUrl}
                  className="w-full h-full object-cover"
                  alt={video.name}
                  onLoad={() => {
                    setLoadedThumbnails(prev => new Set(prev).add(video.id))
                  }}
                  onError={() => {
                    setLoadedThumbnails(prev => new Set(prev).add(video.id))
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-200 flex items-center justify-center">
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs w-4 h-4 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center"
                    onClick={() => removeFromTimeline(video.id)}
                  >
                    ×
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-1">
                  <div className="text-white text-xs font-medium text-center">
                    {index + 1}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Video Grid */}
      <div className="absolute top-40 left-0 right-0 bottom-0 overflow-y-auto bg-black">
        <div className="p-4">
          {isLoading ? (
            <LoadingSpinner isVisible={true} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {allVideos.map((video) => (
                <div
                  key={video.id}
                  className={`relative bg-gray-900 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 group ${
                    selectedVideos.has(video.id) 
                      ? 'ring-2 ring-white ring-opacity-80' 
                      : 'hover:ring-1 hover:ring-gray-400'
                  }`}
                  style={{ aspectRatio: '9/16' }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, video)}
                  onClick={() => handleVideoSelect(video)}
                >
                  {!loadedThumbnails.has(video.id) && (
                    <ThumbnailPlaceholder className="absolute inset-0" />
                  )}
                  <img
                    src={video.thumbnailUrl || video.directUrl}
                    className="w-full h-full object-cover"
                    alt={video.name}
                    onLoad={() => {
                      setLoadedThumbnails(prev => new Set(prev).add(video.id))
                    }}
                    onError={() => {
                      setLoadedThumbnails(prev => new Set(prev).add(video.id))
                    }}
                  />
                  
                  {/* Play icon overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black bg-opacity-50 rounded-full w-8 h-8 flex items-center justify-center">
                      <div className="w-0 h-0 border-l-[6px] border-l-white border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent ml-0.5"></div>
                    </div>
                  </div>
                  
                  {/* Selection overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                    {selectedVideos.has(video.id) && (
                      <div className="bg-white text-black rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                        ✓
                      </div>
                    )}
                  </div>
                  
                  {/* Video info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black to-transparent p-2">
                    <div className="text-white text-xs font-medium truncate">
                      {video.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex justify-center gap-3">
        <Button 
          variant="outline" 
          onClick={() => console.log('Save timeline:', timeline)}
          disabled={timeline.length === 0}
          className="bg-transparent border-gray-600 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          Save Timeline
        </Button>
        <Button 
          onClick={() => console.log('Export timeline:', timeline)}
          disabled={timeline.length === 0}
          className="bg-white text-black hover:bg-gray-200 disabled:opacity-50"
        >
          Export Timeline
        </Button>
      </div>
    </div>
  )
} 