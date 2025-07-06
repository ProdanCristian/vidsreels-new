"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import useSWR from 'swr'
import { FastVideo, VideoResponse, TikTokViewProps } from './types'
import LoadingSpinner from './loading-spinner'
import VideoControls from './video-controls'
import VideoPlayer from './video-player'
import ScrollIndicator from './scroll-indicator'

// Main TikTok View Component
export default function TikTokView({ collectionId, onVideoDownload, isShuffled }: TikTokViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const observerRef = useRef<IntersectionObserver | null>(null)
  
  // Core states
  const [allVideos, setAllVideos] = useState<FastVideo[]>([])
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [globalMuted, setGlobalMuted] = useState(true)
  const [failedVideos, setFailedVideos] = useState<Record<number, boolean>>({})
  const retryCounts = useRef<Record<number, number>>({})
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreVideos, setHasMoreVideos] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  
  // Scroll hint state
  const [showScrollHint, setShowScrollHint] = useState(true)
  const [hasUserScrolled, setHasUserScrolled] = useState(false)

  const fetcher = useCallback(async (url: string): Promise<VideoResponse> => {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch videos: ${response.statusText}`)
    return response.json()
  }, [])

  const { data, isLoading } = useSWR<VideoResponse>(
    collectionId ? `/api/videos/${collectionId}?page=1&limit=3&shuffle=${isShuffled}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  )

  // Initialize videos when data loads
  useEffect(() => {
    if (data?.videos) {
      setAllVideos(data.videos)
      setHasMoreVideos(data.hasMore)
      setCurrentPage(data.page)
      videoRefs.current = new Array(data.videos.length).fill(null)
    }
  }, [data])

  // Reset state when shuffle changes
  useEffect(() => {
    if (isShuffled) {
      setAllVideos([])
      setCurrentVideoIndex(0)
      setCurrentPage(1)
      setHasMoreVideos(true)
      setFailedVideos({})
      setShowScrollHint(true)
      setHasUserScrolled(false)
    }
  }, [isShuffled])

  // Play video function
  const playVideo = useCallback(async (index: number) => {
    const video = videoRefs.current[index]
    const videoData = allVideos[index]
    
    if (!video || !videoData?.directUrl) return
    
    try {
      // Pause all other videos automatically
      videoRefs.current.forEach((v, i) => {
        if (v && i !== index && !v.paused) {
          v.dataset.pauseReason = 'auto' // Set reason for automatic pause
          v.pause()
        }
      })
      
      // Set up video for autoplay
      video.muted = globalMuted
      video.volume = globalMuted ? 0 : 1
      
      if (video.paused) {
        await video.play()
      }
    } catch (error) {
      console.warn(`Failed to play video ${index}:`, error)
      setFailedVideos(prev => ({ ...prev, [index]: true }))
    }
  }, [globalMuted, allVideos])

  // Toggle play/pause
  const togglePlayPause = useCallback(async (index: number) => {
    const video = videoRefs.current[index]
    if (!video) return

    if (video.paused) {
      await playVideo(index)
    } else {
      video.dataset.pauseReason = 'manual' // Set reason for manual pause
      video.pause()
    }
  }, [playVideo])

  // Toggle global mute
  const toggleGlobalMute = useCallback(() => {
    setGlobalMuted(prev => {
      const newMuted = !prev
      
      // Apply to all videos immediately
      videoRefs.current.forEach(video => {
        if (video) {
          video.muted = newMuted
          video.volume = newMuted ? 0 : 1
        }
      })
      
      return newMuted
    })
  }, [])

  // Load more videos
  const loadMoreVideos = useCallback(async () => {
    if (isLoadingMore || !hasMoreVideos) return
    
    setIsLoadingMore(true)
    try {
      const nextPage = currentPage + 1
      const url = `/api/videos/${collectionId}?page=${nextPage}&limit=3&shuffle=${isShuffled}`
      const response = await fetcher(url)

      if (response.videos.length > 0) {
        setAllVideos(prev => {
          const newVideos = [...prev, ...response.videos]
          videoRefs.current = [...videoRefs.current, ...new Array(response.videos.length).fill(null)]
          return newVideos
        })
        setCurrentPage(response.page)
        setHasMoreVideos(response.hasMore)
      } else {
        setHasMoreVideos(false)
      }
    } catch (error) {
      console.error('Failed to load more videos:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [collectionId, currentPage, hasMoreVideos, isShuffled, fetcher, isLoadingMore])

  // Intersection Observer for video switching
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    
    observerRef.current = new IntersectionObserver((entries) => {
      let mostVisibleEntry: IntersectionObserverEntry | null = null
      
      for (const entry of entries) {
        if (!mostVisibleEntry || entry.intersectionRatio > mostVisibleEntry.intersectionRatio) {
          mostVisibleEntry = entry
        }
      }

      if (mostVisibleEntry && mostVisibleEntry.intersectionRatio > 0.5) {
        const index = parseInt((mostVisibleEntry.target as HTMLElement).dataset.index || '0')
        const previousIndex = currentVideoIndex
        setCurrentVideoIndex(index)
        
        // Hide scroll hint if user has scrolled to different video
        if (index !== previousIndex && !hasUserScrolled) {
          setHasUserScrolled(true)
          setShowScrollHint(false)
        }
      }
    }, { 
      root: containerRef.current, 
      threshold: [0.5, 0.7, 0.9]
    })

    videoRefs.current.forEach(video => {
      if (video) observerRef.current?.observe(video)
    })

    return () => observerRef.current?.disconnect()
  }, [allVideos.length, currentVideoIndex, hasUserScrolled])

  // Autoplay current video
  useEffect(() => {
    const video = videoRefs.current[currentVideoIndex]
    if (video && video.paused) {
      setTimeout(() => playVideo(currentVideoIndex), 300)
    }
  }, [currentVideoIndex, playVideo])

  // Load more videos when needed
  useEffect(() => {
    if (currentVideoIndex >= allVideos.length - 2 && hasMoreVideos && !isLoadingMore) {
      loadMoreVideos()
    }
  }, [currentVideoIndex, allVideos.length, hasMoreVideos, isLoadingMore, loadMoreVideos])

  // Handle video download
  const handleVideoDownload = useCallback((video: FastVideo) => {
    onVideoDownload(video.directUrl, `${video.name.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`)
  }, [onVideoDownload])

  // Handle video errors with automatic retries
  const handleVideoError = useCallback((index: number) => {
    const maxRetries = 3
    const currentRetryCount = retryCounts.current[index] || 0

    if (currentRetryCount < maxRetries) {
      retryCounts.current[index] = currentRetryCount + 1
      
      setTimeout(() => {
        const video = videoRefs.current[index]
        if (video) {
          console.log(`Retrying video ${index}, attempt ${currentRetryCount + 1}`)
          video.load()
          // If it's the current video, try to play it after loading
          if (index === currentVideoIndex) {
            playVideo(index).catch(err => {
              console.error(`Retry play failed for video ${index}:`, err)
              // If playing still fails after load, mark as failed
              setFailedVideos(prev => ({ ...prev, [index]: true }))
            })
          }
        }
      }, 1000 * (currentRetryCount + 1)) // Exponential backoff
    } else {
      console.error(`Video ${index} failed after ${maxRetries} retries.`)
      setFailedVideos(prev => ({ ...prev, [index]: true }))
    }
  }, [currentVideoIndex, playVideo])

  return (
    <div 
      ref={containerRef}
      className="fixed top-16 sm:top-20 left-0 right-0 bottom-0 overflow-y-auto bg-black"
      style={{ 
        scrollbarWidth: 'none', 
        msOverflowStyle: 'none',
        scrollSnapType: 'y mandatory',
        scrollSnapStop: 'always',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      {allVideos.map((video, index) => {
        // Skip invalid videos
        if (!video.directUrl || !video.directUrl.startsWith('http')) {
          return null
        }
        
        // Determine preload state
        const isCurrent = index === currentVideoIndex
        const isNext = index === currentVideoIndex + 1
        const isPrev = index === currentVideoIndex - 1
        const preload = isCurrent || isNext || isPrev ? 'auto' : 'metadata'
        
        return (
          <div
            key={`${video.id}-${index}`}
            className="w-full h-full relative flex items-center justify-center"
            style={{ scrollSnapAlign: 'center' }}
          >
            <div 
              className="relative w-full h-full max-w-sm max-h-[680px] mx-auto bg-black rounded-lg overflow-hidden flex items-center justify-center p-4" 
              style={{ aspectRatio: '9/16' }}
            >
              <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
                <VideoPlayer
                  video={video}
                  index={index}
                  isFailed={failedVideos[index] || false}
                  globalMuted={globalMuted}
                  preload={preload}
                  onTogglePlayPause={() => togglePlayPause(index)}
                  onPlay={() => {
                    // Reset retry count on successful play
                    if (retryCounts.current[index]) {
                      delete retryCounts.current[index]
                    }
                  }}
                  onPause={() => {}}
                  onError={() => handleVideoError(index)}
                  videoRef={(el) => { 
                    if (el) {
                      // Set default pause reason for new video elements
                      el.dataset.pauseReason = 'auto'
                    }
                    videoRefs.current[index] = el 
                  }}
                />

                <VideoControls
                  globalMuted={globalMuted}
                  onToggleMute={toggleGlobalMute}
                  onDownload={() => handleVideoDownload(video)}
                />
              </div>
            </div>
          </div>
        )
      })}

      <ScrollIndicator 
        isVisible={showScrollHint && allVideos.length > 1}
        onDismiss={() => {
          setShowScrollHint(false)
          setHasUserScrolled(true)
        }}
      />

      <LoadingSpinner isVisible={isLoading || isLoadingMore} />
    </div>
  )
}