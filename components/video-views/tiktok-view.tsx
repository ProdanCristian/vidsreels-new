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
  const playVideoTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
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
  const [isVideoSwitching, setIsVideoSwitching] = useState(false)

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
      setIsInitialLoad(true)
      setIsVideoSwitching(false)
      
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
      setIsVideoSwitching(false)
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
          await new Promise(resolve => setTimeout(resolve, 50))
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
    
    if (!video || !videoData?.directUrl || isVideoSwitching) return
    
    try {
      setIsVideoSwitching(true)
      
      // First, pause all other videos
      await pauseAllVideosExcept(index)
      
      // Configure video
      video.muted = globalMuted
      video.volume = globalMuted ? 0 : 1
      
      // Only play if video is paused
      if (video.paused) {
        await video.play()
      }
    } catch (error) {
      if (error instanceof Error) {
        console.warn(`Autoplay for video ${index} was prevented. Error: ${error.name} - ${error.message}`)
      } else {
        console.warn(`An unknown autoplay error occurred for video ${index}.`)
      }
    } finally {
      setIsVideoSwitching(false)
    }
  }, [globalMuted, allVideos, pauseAllVideosExcept, isVideoSwitching])

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
      const url = `/api/videos/${collectionId}?page=${nextPage}&limit=10&shuffle=${isShuffled}`
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
      
      // Find the most visible video in the viewport
      for (const entry of entries) {
        if (!mostVisibleEntry || entry.intersectionRatio > mostVisibleEntry.intersectionRatio) {
          mostVisibleEntry = entry
        }
      }

      // If a video is sufficiently visible, mark it as current
      if (mostVisibleEntry && mostVisibleEntry.intersectionRatio > 0.6) {
        const index = parseInt((mostVisibleEntry.target as HTMLElement).dataset.index || '0')
        
        // Don't change video index during initial load
        if (!isInitialLoad && !isVideoSwitching) {
          setCurrentVideoIndex(currentIndex => {
            // Only update state if the index has actually changed
            if (index === currentIndex) {
              return currentIndex
            }

            // If this is the first time the user is scrolling, hide the scroll hint
            if (!hasUserScrolled) {
              setHasUserScrolled(true)
              setShowScrollHint(false)
            }
            
            return index
          })
        }
      }
    }, { 
      root: containerRef.current, 
      threshold: 0.6
    })

    videoRefs.current.forEach(video => {
      if (video) observerRef.current?.observe(video)
    })

    return () => observerRef.current?.disconnect()
  }, [allVideos.length, hasUserScrolled, isInitialLoad, isVideoSwitching])

  // Autoplay current video with improved timing
  useEffect(() => {
    const video = videoRefs.current[currentVideoIndex]
    if (!video || !video.paused || isVideoSwitching) {
      return
    }

    // Clear any existing timeout
    if (playVideoTimeoutRef.current) {
      clearTimeout(playVideoTimeoutRef.current)
    }

    // This function will be called to attempt playback
    const attemptPlay = () => {
      playVideo(currentVideoIndex)
    }

    // Add a small delay to ensure proper video switching
    playVideoTimeoutRef.current = setTimeout(() => {
      // Check if video is ready to play
      if (video.readyState >= 3) {
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
    }, 300) // 300ms delay for mobile Safari

    return () => {
      if (playVideoTimeoutRef.current) {
        clearTimeout(playVideoTimeoutRef.current)
      }
    }
  }, [currentVideoIndex, playVideo, isVideoSwitching])

  // Load more videos when needed
  useEffect(() => {
    if (currentVideoIndex >= allVideos.length - 5 && hasMoreVideos && !isLoadingMore) {
      loadMoreVideos()
    }
  }, [currentVideoIndex, allVideos.length, hasMoreVideos, isLoadingMore, loadMoreVideos])

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
        
        // Preload strategy
        const isCurrent = index === currentVideoIndex
        const isNext = index === currentVideoIndex + 1
        const isPrev = index === currentVideoIndex - 1

        let preload: 'auto' | 'metadata' | 'none' = 'none'

        if (isCurrent || isNext || isPrev) {
          preload = 'auto'
        } else {
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