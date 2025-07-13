"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
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
  const playVideoTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastScrollTimeRef = useRef<number>(0)
  const videoSwitchDebounceRef = useRef<NodeJS.Timeout | null>(null)
  
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
  
  // Flag to prevent immediate observer changes on initial load
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  
  // Video state management
  const [isFastScrolling, setIsFastScrolling] = useState(false)
  const [pendingVideoIndex, setPendingVideoIndex] = useState<number | null>(null)
  
  // Detect if device is mobile
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }, [])
  
  // Adjust limits based on device
  const pageLimit = isMobile ? 20 : 10
  const loadMoreThreshold = isMobile ? 3 : 5
  const preloadRange = isMobile ? 3 : 2

  const fetcher = useCallback(async (url: string): Promise<VideoResponse> => {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch videos: ${response.statusText}`)
    return response.json()
  }, [])

  const { data, isLoading } = useSWR<VideoResponse>(
    collectionId ? `/api/videos/${collectionId}?page=1&limit=${pageLimit}&shuffle=${isShuffled}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  )

  // Get the video that's currently most visible in viewport
  const getCurrentVideoInViewport = useCallback(() => {
    const container = containerRef.current
    if (!container || allVideos.length === 0) return null

    const containerRect = container.getBoundingClientRect()
    const containerCenter = containerRect.top + containerRect.height / 2

    let closestIndex = 0
    let closestDistance = Infinity

    // Check each video element to find which one is closest to the center
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

    return closestIndex
  }, [allVideos.length])

  // Setup scroll velocity detection with viewport checking
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const currentTime = Date.now()
      const timeDiff = currentTime - lastScrollTimeRef.current
      
      // Always check which video is currently in viewport
      const videoInViewport = getCurrentVideoInViewport()
      
      if (timeDiff < 100) { // Fast scrolling if less than 100ms between scroll events
        setIsFastScrolling(true)
        
        // Immediately update to the video in viewport during fast scrolling
        if (videoInViewport !== null && videoInViewport !== currentVideoIndex) {
          setPendingVideoIndex(videoInViewport)
        }
        
        // Clear existing timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
        }
        
        // Set timeout to detect when fast scrolling stops
        scrollTimeoutRef.current = setTimeout(() => {
          setIsFastScrolling(false)
          // Process any pending video switch
          const finalVideoInViewport = getCurrentVideoInViewport()
          if (finalVideoInViewport !== null) {
            setCurrentVideoIndex(finalVideoInViewport)
            setPendingVideoIndex(null)
          }
        }, 200) // Reduced timeout for faster response
      } else {
        setIsFastScrolling(false)
        // Update immediately for normal scrolling
        if (videoInViewport !== null && videoInViewport !== currentVideoIndex) {
          setCurrentVideoIndex(videoInViewport)
        }
      }
      
      lastScrollTimeRef.current = currentTime
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [getCurrentVideoInViewport, currentVideoIndex])

  // Initialize videos when data loads
  useEffect(() => {
    if (data?.videos) {
      setAllVideos(data.videos)
      setHasMoreVideos(data.hasMore)
      setCurrentPage(data.page)
      videoRefs.current = new Array(data.videos.length).fill(null)
      
      // Ensure we start at the first video and scroll to top
      setCurrentVideoIndex(0)
      setIsInitialLoad(true)
      setIsFastScrolling(false)
      setPendingVideoIndex(null)
      
      // Scroll to top after a brief delay to ensure DOM is ready
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = 0
        }
        // Allow intersection observer to work after initial setup
        setTimeout(() => {
          setIsInitialLoad(false)
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
      setIsInitialLoad(true)
      setIsFastScrolling(false)
      setPendingVideoIndex(null)
    }
  }, [isShuffled])

  // Improved function to pause all videos except the current one
  const pauseAllVideosExcept = useCallback(async (currentIndex: number) => {
    const pausePromises = videoRefs.current.map(async (video, index) => {
      if (video && index !== currentIndex && !video.paused) {
        video.dataset.pauseReason = 'auto'
        try {
          video.pause()
          // For mobile Safari, ensure the video actually pauses
          if (!isFastScrolling) {
            await new Promise(resolve => setTimeout(resolve, 50))
          }
        } catch (error) {
          console.warn(`Failed to pause video ${index}:`, error)
        }
      }
    })
    
    if (!isFastScrolling) {
      await Promise.all(pausePromises)
    }
  }, [isFastScrolling])

  // Improved play video function
  const playVideo = useCallback(async (index: number) => {
    const video = videoRefs.current[index]
    const videoData = allVideos[index]
    
    if (!video || !videoData?.directUrl) return
    
    try {
      // Always pause other videos first, regardless of fast scrolling
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
    } finally {
      // Cleanup handled by the caller
    }
  }, [globalMuted, allVideos, pauseAllVideosExcept, isFastScrolling])

  // Toggle play/pause
  const togglePlayPause = useCallback(async (index: number) => {
    const video = videoRefs.current[index]
    if (!video) return

    if (video.paused) {
      await playVideo(index)
    } else {
      video.dataset.pauseReason = 'manual'
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
      const url = `/api/videos/${collectionId}?page=${nextPage}&limit=${pageLimit}&shuffle=${isShuffled}`
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
  }, [collectionId, currentPage, hasMoreVideos, isShuffled, fetcher, isLoadingMore, pageLimit])

  // Debounced video index setter for fast scrolling
  const setVideoIndexDebounced = useCallback((newIndex: number) => {
    if (isFastScrolling) {
      setPendingVideoIndex(newIndex)
      
      // Clear existing debounce
      if (videoSwitchDebounceRef.current) {
        clearTimeout(videoSwitchDebounceRef.current)
      }
      
      // Set new debounce
      videoSwitchDebounceRef.current = setTimeout(() => {
        if (pendingVideoIndex !== null) {
          setCurrentVideoIndex(pendingVideoIndex)
          setPendingVideoIndex(null)
        }
      }, 100) // Reduced debounce time for faster response
    } else {
      setCurrentVideoIndex(newIndex)
    }
  }, [isFastScrolling, pendingVideoIndex])

  // Simplified intersection observer (as backup to scroll-based detection)
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    
    observerRef.current = new IntersectionObserver((entries) => {
      if (isInitialLoad) return // Skip during initial load
      
      let mostVisibleEntry: IntersectionObserverEntry | null = null
      
      // Find the most visible video in the viewport
      for (const entry of entries) {
        if (!mostVisibleEntry || entry.intersectionRatio > mostVisibleEntry.intersectionRatio) {
          mostVisibleEntry = entry
        }
      }

      // Lower threshold for fast scrolling, higher for normal scrolling
      const requiredThreshold = isFastScrolling ? 0.2 : 0.5

      if (mostVisibleEntry && mostVisibleEntry.intersectionRatio > requiredThreshold) {
        const index = parseInt((mostVisibleEntry.target as HTMLElement).dataset.index || '0')
        const currentIndex = isFastScrolling ? (pendingVideoIndex ?? currentVideoIndex) : currentVideoIndex
        
        if (index !== currentIndex) {
          // If this is the first time the user is scrolling, hide the scroll hint
          if (!hasUserScrolled) {
            setHasUserScrolled(true)
            setShowScrollHint(false)
          }
          
          // Only use intersection observer if scroll-based detection missed it
          const viewportVideo = getCurrentVideoInViewport()
          if (viewportVideo === null || viewportVideo === index) {
            setVideoIndexDebounced(index)
          }
        }
      }
    }, { 
      root: containerRef.current,
      // Fewer thresholds for better performance
      threshold: [0.2, 0.5, 0.8],
      rootMargin: '0px 0px -5% 0px'
    })

    videoRefs.current.forEach(video => {
      if (video) observerRef.current?.observe(video)
    })

    return () => observerRef.current?.disconnect()
  }, [allVideos.length, hasUserScrolled, isInitialLoad, isFastScrolling, currentVideoIndex, pendingVideoIndex, setVideoIndexDebounced, getCurrentVideoInViewport])

  // Autoplay current video with improved timing for fast scrolling
  useEffect(() => {
    const targetIndex = isFastScrolling ? (pendingVideoIndex ?? currentVideoIndex) : currentVideoIndex
    const video = videoRefs.current[targetIndex]
    
    if (!video || !video.paused) {
      return
    }

    // Clear any existing timeout
    if (playVideoTimeoutRef.current) {
      clearTimeout(playVideoTimeoutRef.current)
    }

    // This function will be called to attempt playback
    const attemptPlay = () => {
      playVideo(targetIndex)
    }

    // Much faster response for fast scrolling
    const delay = isFastScrolling ? 50 : 200

    playVideoTimeoutRef.current = setTimeout(() => {
      // Check if video is ready to play
      if (video.readyState >= 2) { // HAVE_CURRENT_DATA or higher
        attemptPlay()
      } else {
        // Wait for video to be ready
        const onCanPlay = () => {
          attemptPlay()
        }
        
        video.addEventListener('canplay', onCanPlay, { once: true })

        // Cleanup function
        return () => {
          video.removeEventListener('canplay', onCanPlay)
        }
      }
    }, delay)

    return () => {
      if (playVideoTimeoutRef.current) {
        clearTimeout(playVideoTimeoutRef.current)
      }
    }
  }, [currentVideoIndex, pendingVideoIndex, playVideo, isFastScrolling])

  // Load more videos when needed
  useEffect(() => {
    const effectiveIndex = isFastScrolling ? (pendingVideoIndex ?? currentVideoIndex) : currentVideoIndex
    if (effectiveIndex >= allVideos.length - loadMoreThreshold && hasMoreVideos && !isLoadingMore) {
      loadMoreVideos()
    }
  }, [currentVideoIndex, pendingVideoIndex, allVideos.length, hasMoreVideos, isLoadingMore, loadMoreVideos, isFastScrolling, loadMoreThreshold])

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
        // Skip invalid videos
        if (!video.directUrl || !video.directUrl.startsWith('http')) {
          return null
        }
        
        // Enhanced preload strategy for fast scrolling
        const effectiveCurrentIndex = isFastScrolling ? (pendingVideoIndex ?? currentVideoIndex) : currentVideoIndex
        const isCurrent = index === effectiveCurrentIndex
        const isNear = Math.abs(index - effectiveCurrentIndex) <= 1
        const isExtended = Math.abs(index - effectiveCurrentIndex) <= preloadRange

        let preload: 'auto' | 'metadata' | 'none' = 'none'

        if (isCurrent) {
          preload = 'auto'
        } else if (isNear) {
          preload = 'auto'
        } else if (isExtended && isFastScrolling) {
          preload = 'metadata'
        } else if (isExtended) {
          preload = 'metadata'
        }
        
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

      <ScrollIndicator 
        isVisible={showScrollHint && allVideos.length > 1}
        onDismiss={() => {
          setShowScrollHint(false)
          setHasUserScrolled(true)
        }}
      />

      {/* Global loading spinner only for initial load */}
      {isLoading && <LoadingSpinner isVisible={true} />}
    </div>
  )
}