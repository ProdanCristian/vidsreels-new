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
  const scrollEndTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null)
  const loaderObserverRef = useRef<IntersectionObserver | null>(null)
  
  // Core states
  const [allVideos, setAllVideos] = useState<FastVideo[]>([])
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [globalMuted, setGlobalMuted] = useState(true)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreVideos, setHasMoreVideos] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  
  // Scroll hint state
  const [showScrollHint, setShowScrollHint] = useState(true)
  const [hasUserScrolled, setHasUserScrolled] = useState(false)
  
  // Video state management
  const [manuallyPausedVideos, setManuallyPausedVideos] = useState<Set<number>>(new Set())

  const fetcher = useCallback(async (url: string): Promise<VideoResponse> => {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch videos: ${response.statusText}`)
    return response.json()
  }, [])

  const { data, isLoading } = useSWR<VideoResponse>(
    collectionId ? `/api/videos/${collectionId}?page=1&limit=10&shuffle=${isShuffled}` : null,
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
      
      // Ensure we start at the first video and scroll to top
      setCurrentVideoIndex(0)
      setManuallyPausedVideos(new Set())
      
      // Scroll to top after a brief delay to ensure DOM is ready
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = 0
        }
        // Allow intersection observer to work after initial setup
        setTimeout(() => {
        }, 500)
      }, 100)
    }
  }, [data])

  // Reset state when shuffle changes
  useEffect(() => {
    if (isShuffled) {
      setAllVideos([])
      setCurrentVideoIndex(0)
      setCurrentPage(1)
      setHasMoreVideos(true)
      setShowScrollHint(true)
      setHasUserScrolled(false)
      setManuallyPausedVideos(new Set())
    }
  }, [isShuffled])

  // Improved function to pause all videos except the current one
  const pauseAllVideosExcept = useCallback(async (currentIndex: number) => {
    const pausePromises = videoRefs.current.map(async (video, index) => {
      if (video && index !== currentIndex && !video.paused) {
        video.dataset.pauseReason = 'auto'
        try {
          video.pause()
        } catch (error) {
          console.warn(`Failed to pause video ${index}:`, error)
        }
      }
    })
    
    await Promise.all(pausePromises)
  }, [])

  // Improved play video function
  const playVideo = useCallback(async (index: number) => {
    const video = videoRefs.current[index]
    const videoData = allVideos[index]

    // When a video is instructed to play, it should no longer be in the manually paused state.
    setManuallyPausedVideos(prev => {
      if (!prev.has(index)) return prev // Avoid unnecessary state update
      const newSet = new Set(prev)
      newSet.delete(index)
      return newSet
    })
    
    if (!video || !videoData?.directUrl) return
    
    try {
      // Always pause other videos first
      await pauseAllVideosExcept(index)
      
      // Configure video
      video.muted = globalMuted
      video.volume = globalMuted ? 0 : 1
      
      // Only play if video is paused and ready
      if (video.paused && video.readyState >= 2) {
        await video.play()
      }
    } catch (error) {
      if (error instanceof Error) {
        console.warn(`Autoplay for video ${index} was prevented. Error: ${error.name} - ${error.message}`)
      } else {
        console.warn(`An unknown autoplay error occurred for video ${index}.`)
      }
    }
  }, [globalMuted, allVideos, pauseAllVideosExcept])

  // Toggle play/pause
  const togglePlayPause = useCallback(async (index: number) => {
    const video = videoRefs.current[index]
    if (!video) return

    if (video.paused) {
      // playVideo will handle removing it from the manuallyPausedVideos set.
      await playVideo(index)
    } else {
      // User is manually pausing the video, so add it to the paused set
      setManuallyPausedVideos(prev => new Set(prev).add(index))
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
      const url = `/api/videos/${collectionId}?page=${nextPage}&limit=10&shuffle=${isShuffled}`
      const response = await fetcher(url)

      if (response.videos.length > 0) {
        setAllVideos(prev => {
          const newVideos = [...prev, ...response.videos]
          // Ensure videoRefs array is extended correctly
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

  // Authoritative "scroll end" handler to set the current video
  const getMostVisibleVideoIndex = useCallback(() => {
    const container = containerRef.current
    if (!container || allVideos.length === 0) return null

    const containerRect = container.getBoundingClientRect()
    const containerCenter = containerRect.top + containerRect.height / 2

    let closestIndex = -1
    let closestDistance = Infinity

    videoRefs.current.forEach((videoElement, index) => {
      if (videoElement) {
        const videoRect = videoElement.getBoundingClientRect()
        const videoCenter = videoRect.top + videoRect.height / 2
        const distance = Math.abs(videoCenter - containerCenter)

        if (distance < closestDistance) {
          closestDistance = distance
          closestIndex = index
        }
      }
    })
    return closestIndex === -1 ? null : closestIndex
  }, [allVideos.length])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScrollEnd = () => {
      const mostVisibleIndex = getMostVisibleVideoIndex()
      if (mostVisibleIndex !== null && mostVisibleIndex !== currentVideoIndex) {
        if (!hasUserScrolled) setHasUserScrolled(true)
        setCurrentVideoIndex(mostVisibleIndex)
      }
    }

    const handleScroll = () => {
      if (scrollEndTimeoutRef.current) clearTimeout(scrollEndTimeoutRef.current)
      scrollEndTimeoutRef.current = setTimeout(handleScrollEnd, 150)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollEndTimeoutRef.current) clearTimeout(scrollEndTimeoutRef.current)
    }
  }, [getMostVisibleVideoIndex, currentVideoIndex, hasUserScrolled])
  
  // Autoplay current video and preload next ones
  useEffect(() => {
    // Autoplay logic
    const video = videoRefs.current[currentVideoIndex]
    if (video && video.paused && !manuallyPausedVideos.has(currentVideoIndex)) {
      playVideo(currentVideoIndex)
    }

    // Proactive preloading for smoother playback
    const preloadNextVideos = (count: number) => {
      for (let i = 1; i <= count; i++) {
        const nextVideo = videoRefs.current[currentVideoIndex + i]
        if (nextVideo && nextVideo.preload !== 'auto') {
          nextVideo.preload = 'auto'
          nextVideo.load()
        }
      }
    }
    preloadNextVideos(2) // Preload next 2 videos

  }, [currentVideoIndex, playVideo, manuallyPausedVideos])

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreVideos && !isLoadingMore) {
          loadMoreVideos()
        }
      },
      { root: containerRef.current, rootMargin: '200% 0px' }
    )

    if (loadMoreTriggerRef.current) {
      observer.observe(loadMoreTriggerRef.current)
    }
    loaderObserverRef.current = observer

    return () => {
      if (loaderObserverRef.current) {
        loaderObserverRef.current.disconnect()
      }
    }
  }, [hasMoreVideos, isLoadingMore, loadMoreVideos])


  // Handle video download
  const handleVideoDownload = useCallback((video: FastVideo) => {
    onVideoDownload(video.directUrl, `${video.name.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`)
  }, [onVideoDownload])

  // Handle video error
  const handleVideoError = useCallback(() => {
    // Intentionally left blank
  }, [])

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
        if (!video.directUrl || !video.directUrl.startsWith('http')) {
          return null
        }
        
        const isCurrent = index === currentVideoIndex
        const preload = isCurrent ? 'auto' : 'metadata'
        
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
                  isActive={isCurrent}
                  globalMuted={globalMuted}
                  preload={preload}
                  showPlayButton={manuallyPausedVideos.has(index)}
                  onTogglePlayPause={() => togglePlayPause(index)}
                  onPlay={() => {}}
                  onPause={() => {}}
                  onError={() => handleVideoError()}
                  videoRef={(el) => { 
                    if (el) {
                      el.dataset.pauseReason = 'auto'
                      el.dataset.index = index.toString()
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
      
      {/* Sentinel element for infinite scroll */}
      {hasMoreVideos && !isLoadingMore && (
        <div ref={loadMoreTriggerRef} style={{ height: '200px', background: 'transparent' }} />
      )}


      <ScrollIndicator 
        isVisible={showScrollHint && allVideos.length > 1}
        onDismiss={() => {
          setShowScrollHint(false)
          setHasUserScrolled(true)
        }}
      />

      {/* Loading spinner for initial load and when fetching more videos */}
      {(isLoading || isLoadingMore) && <LoadingSpinner isVisible={true} />}
    </div>
  )
}