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
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreVideos, setHasMoreVideos] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  
  // Scroll hint state
  const [showScrollHint, setShowScrollHint] = useState(true)
  const [hasUserScrolled, setHasUserScrolled] = useState(false)

  // User interaction state for mobile autoplay
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  
  // Flag to prevent immediate observer changes on initial load
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Detect mobile Safari
  const isMobileSafari = useCallback(() => {
    if (typeof window === 'undefined') return false
    const ua = window.navigator.userAgent
    return /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/Chrome/.test(ua)
  }, [])

  // Add user interaction listeners for mobile autoplay
  useEffect(() => {
    const handleUserInteraction = () => {
      setHasUserInteracted(true)
      // Remove listeners after first interaction
      document.removeEventListener('touchstart', handleUserInteraction)
      document.removeEventListener('click', handleUserInteraction)
    }

    // Add listeners for mobile
    if (isMobileSafari()) {
      document.addEventListener('touchstart', handleUserInteraction, { passive: true })
      document.addEventListener('click', handleUserInteraction)
    } else {
      // For desktop, assume user has interacted
      setHasUserInteracted(true)
    }

    return () => {
      document.removeEventListener('touchstart', handleUserInteraction)
      document.removeEventListener('click', handleUserInteraction)
    }
  }, [isMobileSafari])

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
    }
  }, [isShuffled])

  // Improved function to pause all videos except the current one
  const pauseAllVideosExcept = useCallback((currentIndex: number) => {
    videoRefs.current.forEach((video, index) => {
      if (video && index !== currentIndex && !video.paused) {
        video.dataset.pauseReason = 'auto'
        video.pause()
        // Force immediate pause for mobile Safari
        if (isMobileSafari()) {
          video.currentTime = video.currentTime
        }
      }
    })
  }, [isMobileSafari])

  // Play video function with better mobile Safari handling
  const playVideo = useCallback(async (index: number) => {
    const video = videoRefs.current[index]
    const videoData = allVideos[index]
    
    if (!video || !videoData?.directUrl) return
    
    try {
      // First, pause all other videos
      pauseAllVideosExcept(index)
      
      // Wait a bit for other videos to pause (important for mobile Safari)
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Set up video for autoplay
      video.muted = globalMuted
      video.volume = globalMuted ? 0 : 1
      
      // For mobile Safari, ensure video is properly configured
      if (isMobileSafari()) {
        video.setAttribute('playsinline', 'true')
        video.setAttribute('webkit-playsinline', 'true')
        
        // Only attempt autoplay if user has interacted
        if (!hasUserInteracted) {
          console.log('Waiting for user interaction before autoplay on mobile Safari')
          return
        }
      }
      
      if (video.paused) {
        await video.play()
      }
    } catch (error) {
      // Enhanced error handling for mobile Safari
      if (error instanceof Error) {
        console.warn(`Autoplay for video ${index} was prevented. Error: ${error.name} - ${error.message}`)
        
        // For mobile Safari, this is often expected behavior
        if (isMobileSafari() && error.name === 'NotAllowedError') {
          console.log('Mobile Safari autoplay blocked - user interaction required')
        }
      } else {
        console.warn(`An unknown autoplay error occurred for video ${index}.`)
      }
    }
  }, [globalMuted, allVideos, pauseAllVideosExcept, isMobileSafari, hasUserInteracted])

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
    
    // This observer's job is to identify which video is currently centered.
    observerRef.current = new IntersectionObserver((entries) => {
      let mostVisibleEntry: IntersectionObserverEntry | null = null
      
      // Find the most visible video in the viewport.
      for (const entry of entries) {
        if (!mostVisibleEntry || entry.intersectionRatio > mostVisibleEntry.intersectionRatio) {
          mostVisibleEntry = entry
        }
      }

      // If a video is sufficiently visible, we'll mark it as current.
      if (mostVisibleEntry && mostVisibleEntry.intersectionRatio > 0.6) {
        const index = parseInt((mostVisibleEntry.target as HTMLElement).dataset.index || '0')
        
        // Don't change video index during initial load to prevent unwanted switching
        if (!isInitialLoad) {
          setCurrentVideoIndex(currentIndex => {
            // Only update state if the index has actually changed.
            if (index === currentIndex) {
              return currentIndex
            }

            // If this is the first time the user is scrolling, hide the scroll hint.
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
      // Using a single, higher threshold makes detection more reliable.
      threshold: 0.6
    })

    videoRefs.current.forEach(video => {
      if (video) observerRef.current?.observe(video)
    })

    return () => observerRef.current?.disconnect()
  }, [allVideos.length, hasUserScrolled, isInitialLoad])

  // Autoplay current video with readiness check and mobile Safari handling
  useEffect(() => {
    const video = videoRefs.current[currentVideoIndex];
    if (!video || !video.paused) {
      return;
    }

    // This function will be called to attempt playback.
    const attemptPlay = () => {
      playVideo(currentVideoIndex);
    };

    // For mobile Safari, add additional delay to ensure proper video switching
    const delay = isMobileSafari() ? 200 : 0;
    
    const timeoutId = setTimeout(() => {
      // readyState >= 3 means the video has enough data to start playing.
      if (video.readyState >= 3) {
        attemptPlay();
      } else {
        // If the video is not ready, we wait for the 'canplay' event.
        const onCanPlay = () => {
          attemptPlay();
        };
        
        video.addEventListener('canplay', onCanPlay, { once: true });

        // Cleanup function
        return () => {
          video.removeEventListener('canplay', onCanPlay);
        };
      }
    }, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [currentVideoIndex, playVideo, isMobileSafari]);

  // Load more videos when needed (when user is 5 videos away from the end)
  useEffect(() => {
    if (currentVideoIndex >= allVideos.length - 5 && hasMoreVideos && !isLoadingMore) {
      loadMoreVideos()
    }
  }, [currentVideoIndex, allVideos.length, hasMoreVideos, isLoadingMore, loadMoreVideos])

  // Handle video download
  const handleVideoDownload = useCallback((video: FastVideo) => {
    onVideoDownload(video.directUrl, `${video.name.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`)
  }, [onVideoDownload])

  // This function is now effectively silenced. The VideoPlayer handles its own
  // retries and logging. We no longer need to log a redundant message here.
  const handleVideoError = useCallback(() => {
    // Intentionally left blank.
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
        
        // A more aggressive preload strategy for both desktop and mobile to ensure
        // faster video starts and smoother scrolling.
        const isCurrent = index === currentVideoIndex;
        const isNext = index === currentVideoIndex + 1;
        const isPrev = index === currentVideoIndex - 1;

        let preload: 'auto' | 'metadata' | 'none' = 'none';

        if (isCurrent || isNext || isPrev) {
          preload = 'auto';
        } else {
          preload = 'metadata';
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
                      // Set default pause reason for new video elements
                      el.dataset.pauseReason = 'auto'
                      
                      // Configure mobile Safari specific attributes
                      if (isMobileSafari()) {
                        el.setAttribute('playsinline', 'true')
                        el.setAttribute('webkit-playsinline', 'true')
                      }
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

      {/* Show a message for mobile Safari users if autoplay is blocked */}
      {isMobileSafari() && !hasUserInteracted && (
        <div className="fixed bottom-20 left-4 right-4 bg-gray-800 text-white p-3 rounded-lg text-sm z-50">
          Tap anywhere to enable video autoplay
        </div>
      )}

      {/* Global loading spinner only for initial load */}
      {isLoading && <LoadingSpinner isVisible={true} />}
    </div>
  )
}