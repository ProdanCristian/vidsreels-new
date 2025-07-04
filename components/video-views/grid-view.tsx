"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Download, Play, Volume2, VolumeX, Pause } from "lucide-react"
import { cn } from "@/lib/utils"

// Assuming the video object has at least 'key' and 'name' properties.
// A more specific type can be imported if available.
interface Video {
  key: string
  name: string
}

interface GridViewProps {
  videos: Video[]
  currentPage: number
  totalPages: number
  loadingMore: boolean
  onPageChange: (page: number) => void
  onVideoDownload: (videoUrl: string, filename: string) => void
}

const GridView = ({ videos, currentPage, totalPages, loadingMore, onPageChange, onVideoDownload }: GridViewProps) => {
  const [isPlaying, setIsPlaying] = useState<boolean[]>(Array(videos.length).fill(false))
  const [isMuted, setIsMuted] = useState<boolean[]>(Array(videos.length).fill(false))
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  useEffect(() => {
    videoRefs.current = videoRefs.current.slice(0, videos.length)
  }, [videos])

  const getThumbnailUrl = (videoKey: string): string => {
    const filename = videoKey.split('/').pop() || '';
    const lastDotIndex = filename.lastIndexOf('.');
    // If there's no dot, or it's the first character, use the whole filename
    const baseName = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
    return `/api/video-proxy/${encodeURIComponent(baseName)}.webp`;
  };

  // Effect to handle playing/pausing videos when state changes
  useEffect(() => {
    isPlaying.forEach((playing, index) => {
      const videoElement = videoRefs.current[index]
      if (videoElement) {
        if (playing && videoElement.paused) {
          videoElement.play().catch(error => {
            console.warn("Video play failed, trying muted", error)
            videoElement.muted = true
            setIsMuted(prev => {
              const newMuted = [...prev]
              newMuted[index] = true
              return newMuted
            })
            videoElement.play().catch(mutedError => console.error("Muted play also failed", mutedError))
          })
        } else if (!playing && !videoElement.paused) {
          videoElement.pause()
        }
      }
    })
  }, [isPlaying])

  if (!videos) {
    return null
  }

  const togglePlayPause = (index: number) => {
    const newIsPlaying = [...isPlaying]
    
    // If we're starting to play this video, pause all others
    if (!newIsPlaying[index]) {
      // Pause all other videos
      newIsPlaying.fill(false)
      newIsPlaying[index] = true
    } else {
      // If we're pausing this video, just pause it
      newIsPlaying[index] = false
    }
    
    setIsPlaying(newIsPlaying)
  }

  const toggleMute = (index: number) => {
    const newIsMuted = [...isMuted]
    newIsMuted[index] = !newIsMuted[index]
    setIsMuted(newIsMuted)

    const videoElement = videoRefs.current[index]
    if (videoElement) {
      videoElement.muted = newIsMuted[index]
    }
  }

  return (
    <div className="pt-20 sm:pt-24 px-4 pb-8 relative min-h-screen">
      {/* Loading state overlay */}
      {loadingMore && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
        </div>
      )}

      <div className={`max-w-7xl mx-auto transition-opacity duration-300 ${loadingMore ? 'opacity-30 blur-sm' : 'opacity-100'}`}>
        {/* Grid of videos */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {videos.map((video, index) => (
            <div 
              key={`${video.key}-${index}`} 
              className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden group cursor-pointer"
              onClick={() => togglePlayPause(index)}
            >
              {/* Thumbnail Image */}
              <Image
                src={getThumbnailUrl(video.key)}
                alt={video.name}
                fill
                className={cn(
                  'object-cover transition-opacity duration-300 ease-in-out group-hover:scale-105',
                  isPlaying[index] ? 'opacity-0' : 'opacity-100'
                )}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/video-placeholder.png';
                }}
              />

              {/* Video Player */}
              {isPlaying[index] && (
                <video
                  ref={(el) => { videoRefs.current[index] = el }}
                  className="absolute inset-0 w-full h-full object-cover"
                  loop
                  playsInline
                  muted={isMuted[index]}
                  onEnded={() => {
                    const newIsPlaying = [...isPlaying]
                    newIsPlaying[index] = false
                    setIsPlaying(newIsPlaying)
                  }}
                  src={`/api/video-proxy/${encodeURIComponent(video.key)}`}
                />
              )}
              
              {/* Play/Pause Overlay */}
              <div className={cn(
                'absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity duration-300',
                isPlaying[index] 
                  ? 'opacity-0'
                  : 'opacity-100 group-hover:bg-black/40'
              )}>
                <div className={cn(
                  'bg-white/25 backdrop-blur-sm rounded-full p-3 transition-all duration-200',
                  isPlaying[index]
                    ? 'opacity-0 scale-75'
                    : 'opacity-100 scale-100 group-hover:bg-white/35'
                )}>
                  {isPlaying[index] ? (
                    <Pause className="w-8 h-8 text-white" fill="white" />
                  ) : (
                    <Play className="w-8 h-8 text-white" fill="white" />
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className={cn(
                'absolute top-2 right-2 flex space-x-1 transition-opacity duration-200',
                isPlaying[index] ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}>
                {/* Mute/Unmute Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleMute(index)
                  }}
                  className="border-none bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 rounded-full p-2 h-8 w-8"
                >
                  {isMuted[index] ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>

                {/* Download button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onVideoDownload(video.key, video.name)
                  }}
                  className="border-none bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 rounded-full p-2 h-8 w-8"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center">
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* First page */}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1 || loadingMore}
                onClick={() => onPageChange(1)}
                className="hidden sm:inline-flex bg-black/50 border-white/20 text-white hover:bg-black/70 disabled:opacity-50"
              >
                First
              </Button>

              {/* Previous page */}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1 || loadingMore}
                onClick={() => onPageChange(currentPage - 1)}
                className="bg-black/50 border-white/20 text-white hover:bg-black/70 disabled:opacity-50"
              >
                <span aria-hidden="true">←</span>
                <span className="hidden sm:inline ml-1">Previous</span>
              </Button>

              {/* Page numbers (Desktop) */}
              <div className="hidden sm:flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      disabled={loadingMore}
                      onClick={() => onPageChange(pageNum)}
                      className={`w-10 h-8 ${
                        currentPage === pageNum
                          ? 'bg-white text-black hover:bg-gray-200'
                          : 'bg-black/50 border-white/20 text-white hover:bg-black/70'
                      } disabled:opacity-50`}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              
              {/* Page numbers (Mobile) */}
              <div className="flex sm:hidden items-center space-x-1">
                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 3) {
                    pageNum = i + 1
                  } else if (currentPage <= 2) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 1) {
                    pageNum = totalPages - 2 + i
                  } else {
                    pageNum = currentPage - 1 + i
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      disabled={loadingMore}
                      onClick={() => onPageChange(pageNum)}
                      className={`w-10 h-8 ${
                        currentPage === pageNum 
                          ? 'bg-white text-black hover:bg-gray-200' 
                          : 'bg-black/50 border-white/20 text-white hover:bg-black/70'
                      } disabled:opacity-50`}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>

              {/* Next page */}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages || loadingMore}
                onClick={() => onPageChange(currentPage + 1)}
                className="bg-black/50 border-white/20 text-white hover:bg-black/70 disabled:opacity-50"
              >
                <span className="hidden sm:inline mr-1">Next</span>
                <span aria-hidden="true">→</span>
              </Button>

              {/* Last page */}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages || loadingMore}
                onClick={() => onPageChange(totalPages)}
                className="hidden sm:inline-flex bg-black/50 border-white/20 text-white hover:bg-black/70 disabled:opacity-50"
              >
                Last
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GridView