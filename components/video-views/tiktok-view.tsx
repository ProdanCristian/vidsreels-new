"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Play, Volume2, VolumeX } from 'lucide-react'
import useSWR from 'swr'

interface FastVideo {
  id: string
  name: string
  size: string
  streamUrl: string
  directUrl: string
  embedUrl: string
  thumbnailUrl: string
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

interface TikTokViewProps {
  collectionId: string
  onVideoDownload: (videoUrl: string, filename: string) => void
  isShuffled: boolean
}

// ULTRA-FAST TikTok View with Direct Google Drive Streaming
export default function TikTokView({ collectionId, onVideoDownload, isShuffled }: TikTokViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const isLoadingMoreRef = useRef(false)
  const playPromisesRef = useRef<Record<number, Promise<void> | null>>({})
  
  // States
  const [allVideos, setAllVideos] = useState<FastVideo[]>([])
  const [playingStates, setPlayingStates] = useState<Record<number, boolean>>({})
  const [globalMuted, setGlobalMuted] = useState(true)
  const [failedVideos, setFailedVideos] = useState<Record<number, boolean>>({})
  // Removed loadingVideos state since we use global loading indicator
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [manuallyPaused, setManuallyPaused] = useState<Record<number, boolean>>({})
  const retryAttemptsRef = useRef<Record<number, number>>({})
  const scrollIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const scrollIndicatorHideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreVideos, setHasMoreVideos] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [showScrollIndicator, setShowScrollIndicator] = useState(false)
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

  useEffect(() => {
    if (data?.videos) {
      setAllVideos(data.videos)
      setHasMoreVideos(data.hasMore)
      setCurrentPage(data.page)
      videoRefs.current = new Array(data.videos.length).fill(null)
    }
  }, [data])

  useEffect(() => {
    if (isShuffled) {
      setAllVideos([])
      setCurrentVideoIndex(0)
      setCurrentPage(1)
      setHasMoreVideos(true)
      setPlayingStates({})
      setManuallyPaused({})
      setHasUserScrolled(false)
      setShowScrollIndicator(false)
      // Clear any pending timeouts
      if (scrollIndicatorTimeoutRef.current) {
        clearTimeout(scrollIndicatorTimeoutRef.current)
        scrollIndicatorTimeoutRef.current = null
      }
      if (scrollIndicatorHideTimeoutRef.current) {
        clearTimeout(scrollIndicatorHideTimeoutRef.current)
        scrollIndicatorHideTimeoutRef.current = null
      }
    }
  }, [isShuffled])

  const safePause = useCallback(async (video: HTMLVideoElement, index: number) => {
    const playPromise = playPromisesRef.current[index]
    if (playPromise) {
      await playPromise.catch(() => {})
    }
    if (!video.paused) {
      video.pause()
    }
  }, [])

  const playVideo = useCallback(async (index: number) => {
    const video = videoRefs.current[index]
    if (!video || !video.paused) return

    // Pause all other videos
    await Promise.all(
      videoRefs.current.map((v, i) => {
        if (v && i !== index) {
          return safePause(v, i)
        }
        return Promise.resolve()
      })
    )
    
    // Automatically unmute audio when playing the first video
    if (index === 0 && globalMuted) {
      setGlobalMuted(false)
    }
    
    // Show scroll indicator after first video starts playing
    if (index === 0 && !hasUserScrolled) {
      scrollIndicatorTimeoutRef.current = setTimeout(() => {
        if (!hasUserScrolled) {
          setShowScrollIndicator(true)
          // Hide indicator after 4 seconds
          scrollIndicatorHideTimeoutRef.current = setTimeout(() => {
            setShowScrollIndicator(false)
          }, 4000)
        }
      }, 1000)
    }
    
    try {
      const playPromise = video.play()
      playPromisesRef.current[index] = playPromise
      await playPromise
    } catch (error) {
      console.error(`Video ${index} failed to play:`, error)
    } finally {
      playPromisesRef.current[index] = null
    }
  }, [safePause, globalMuted, hasUserScrolled])

  const togglePlayPause = useCallback(async (index: number) => {
    const video = videoRefs.current[index]
    if (!video) return

    if (video.paused) {
      setManuallyPaused(prev => ({ ...prev, [index]: false }))
      await playVideo(index)
    } else {
      setManuallyPaused(prev => ({ ...prev, [index]: true }))
      await safePause(video, index)
    }
  }, [playVideo, safePause])
  
  // Autoplay logic driven by currentVideoIndex
  useEffect(() => {
    if (manuallyPaused[currentVideoIndex]) return
    
    const video = videoRefs.current[currentVideoIndex]
    if (video && video.paused) {
      // Small delay to ensure video is ready
      setTimeout(() => {
        playVideo(currentVideoIndex)
      }, 100)
    }
  }, [currentVideoIndex, manuallyPaused, playVideo])

  // Intersection Observer to set current video
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    
    observerRef.current = new IntersectionObserver((entries) => {
      let mostVisibleEntry: IntersectionObserverEntry | null = null
      for (const entry of entries) {
        if (!mostVisibleEntry || entry.intersectionRatio > mostVisibleEntry.intersectionRatio) {
          mostVisibleEntry = entry
        }
      }

      if (mostVisibleEntry && mostVisibleEntry.intersectionRatio > 0.6) {
        const index = parseInt((mostVisibleEntry.target as HTMLElement).dataset.index || '0')
        setCurrentVideoIndex(index)
      }
    }, { root: containerRef.current, threshold: 0.6 })

    // Re-observe all videos when the list changes
    videoRefs.current.forEach(video => {
      if (video) observerRef.current?.observe(video)
    })

    return () => observerRef.current?.disconnect()
  }, [allVideos.length])

  // Observe new videos when they're added (handles dynamic loading)
  useEffect(() => {
    if (observerRef.current) {
      // Observe any new videos that were added
              videoRefs.current.forEach(video => {
          if (video) {
            observerRef.current?.observe(video)
          }
        })
    }
  }, [allVideos.length])

  // Scroll listener to hide indicator when user scrolls
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      if (!hasUserScrolled) {
        setHasUserScrolled(true)
        setShowScrollIndicator(false)
        // Clear any pending timeouts
        if (scrollIndicatorTimeoutRef.current) {
          clearTimeout(scrollIndicatorTimeoutRef.current)
          scrollIndicatorTimeoutRef.current = null
        }
        if (scrollIndicatorHideTimeoutRef.current) {
          clearTimeout(scrollIndicatorHideTimeoutRef.current)
          scrollIndicatorHideTimeoutRef.current = null
        }
      }
    }

    const handleTouchStart = () => {
      if (!hasUserScrolled) {
        setHasUserScrolled(true)
        setShowScrollIndicator(false)
        // Clear any pending timeouts
        if (scrollIndicatorTimeoutRef.current) {
          clearTimeout(scrollIndicatorTimeoutRef.current)
          scrollIndicatorTimeoutRef.current = null
        }
        if (scrollIndicatorHideTimeoutRef.current) {
          clearTimeout(scrollIndicatorHideTimeoutRef.current)
          scrollIndicatorHideTimeoutRef.current = null
        }
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchStart, { passive: true })
    
    return () => {
      container.removeEventListener('scroll', handleScroll)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchStart)
    }
  }, [hasUserScrolled])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (scrollIndicatorTimeoutRef.current) {
        clearTimeout(scrollIndicatorTimeoutRef.current)
      }
      if (scrollIndicatorHideTimeoutRef.current) {
        clearTimeout(scrollIndicatorHideTimeoutRef.current)
      }
    }
  }, [])
  
  const loadMoreVideos = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMoreVideos) return
    isLoadingMoreRef.current = true
    setIsLoadingMore(true)

    try {
      const nextPage = currentPage + 1
      const url = `/api/videos/${collectionId}?page=${nextPage}&limit=3&shuffle=${isShuffled}`
      const response = await fetcher(url)

      if (response.videos.length > 0) {
        setAllVideos(prev => {
          const newVideos = [...prev, ...response.videos]
          // Expand video refs array to accommodate new videos
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
      isLoadingMoreRef.current = false
      setIsLoadingMore(false)
    }
  }, [collectionId, currentPage, hasMoreVideos, isShuffled, fetcher])

  useEffect(() => {
    // Load more videos when we're at the second-to-last video (1 video remaining)
    if (currentVideoIndex >= allVideos.length - 2 && hasMoreVideos) {
      loadMoreVideos()
    }
  }, [currentVideoIndex, allVideos.length, hasMoreVideos, loadMoreVideos])

  // Aggressive preloading - load next batch when we're at the last video of current batch
  useEffect(() => {
    // If we have videos and we're at the last video, preload more
    if (allVideos.length > 0 && currentVideoIndex === allVideos.length - 1 && hasMoreVideos && !isLoadingMore) {
      loadMoreVideos()
    }
  }, [currentVideoIndex, allVideos.length, hasMoreVideos, isLoadingMore, loadMoreVideos])

  const handleVideoError = useCallback((index: number) => {
    const currentAttempts = retryAttemptsRef.current[index] || 0;
    if (currentAttempts < 2) { // Retry up to 2 times
      console.log(`🔄 Retrying video ${index}, attempt ${currentAttempts + 1}`);
      retryAttemptsRef.current[index] = currentAttempts + 1;
      const video = videoRefs.current[index];
      if (video) {
        // Wait a bit before retrying
        setTimeout(() => {
          video.load(); // This will re-trigger loading
        }, 500 * (currentAttempts + 1)); // Exponential backoff
      }
    } else {
      console.error(`❌ Video ${index} failed after multiple attempts.`);
      setFailedVideos(prev => ({ ...prev, [index]: true }));
    }
  }, []);

  const toggleGlobalMute = useCallback(() => setGlobalMuted(prev => !prev), [])

  const handleVideoDownload = useCallback((video: FastVideo) => {
    onVideoDownload(video.streamUrl, `${video.name.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`)
  }, [onVideoDownload])

  // Prefetch next videos for smoother playback
  const prefetchNextVideos = useCallback(() => {
    const nextVideosToPreload = 2 // Preload next 2 videos
    const startIndex = currentVideoIndex + 1
    
    for (let i = startIndex; i < Math.min(startIndex + nextVideosToPreload, allVideos.length); i++) {
      const video = allVideos[i]
      if (video) {
        // Create a prefetch link element
        const link = document.createElement('link')
        link.rel = 'prefetch'
        link.href = video.streamUrl
        link.as = 'video'
        document.head.appendChild(link)
        
        // Remove after a short delay to avoid cluttering the head
        setTimeout(() => {
          if (document.head.contains(link)) {
            document.head.removeChild(link)
          }
        }, 5000)
      }
    }
  }, [currentVideoIndex, allVideos])

  // Trigger prefetch when current video changes
  useEffect(() => {
    if (allVideos.length > 0) {
      prefetchNextVideos()
    }
  }, [currentVideoIndex, allVideos.length, prefetchNextVideos])

  return (
    <div 
      ref={containerRef}
      className="fixed top-16 sm:top-20 left-0 right-0 bottom-0 overflow-y-auto bg-black"
      style={{ 
        scrollbarWidth: 'none', 
        msOverflowStyle: 'none',
        scrollSnapType: 'y mandatory',
        scrollSnapStop: 'always',
        willChange: 'scroll-position',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      {allVideos.map((video, index) => {
        return (
          <div
            key={`${video.id}-${index}`}
            className="w-full h-full relative flex items-center justify-center"
            data-video-container
            style={{ 
              scrollSnapAlign: 'center',
            }}
          >
            <div 
              className="relative w-full h-full max-w-sm max-h-[680px] mx-auto bg-black rounded-lg overflow-hidden flex items-center justify-center p-4 lg:p-2 xl:p-1" 
              style={{ aspectRatio: '9/16' }}
            >
              <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
              {!failedVideos[index] ? (
                <video
                  ref={el => { videoRefs.current[index] = el }}
                  data-index={index}
                  className="w-full h-full object-cover rounded-lg"
                  poster={video.thumbnailUrl}
                  controls={false}
                  playsInline
                  loop
                  muted={globalMuted}
                  preload={
                    // Aggressively preload current, next, and previous video
                    Math.abs(index - currentVideoIndex) <= 1 ? "auto" : "metadata"
                  }
                  crossOrigin="anonymous"
                  onClick={() => togglePlayPause(index)}
                  onPlay={() => setPlayingStates(prev => ({ ...prev, [index]: true }))}
                  onPause={() => setPlayingStates(prev => ({ ...prev, [index]: false }))}
                  onError={() => handleVideoError(index)}
                  src={video.streamUrl}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-white rounded-lg">
                  <p className="font-semibold">Could not load video</p>
                  <p className="text-sm text-zinc-400">Please try again later.</p>
                </div>
              )}
              
              {/* Loading Overlay - Remove individual video loading indicators since we have a global one */}

              {/* Play/Pause Button */}
              {!playingStates[index] && !failedVideos[index] && (index === 0 || manuallyPaused[index]) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 pointer-events-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayPause(index);
                    }}
                  >
                    <Play className="w-10 h-10 ml-2" />
                  </Button>
                </div>
              )}

              {/* Control Buttons */}
              <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60"
                  onClick={(e) => { e.stopPropagation(); toggleGlobalMute(); }}
                >
                  {globalMuted ? <VolumeX /> : <Volume2 />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60"
                  onClick={(e) => { e.stopPropagation(); handleVideoDownload(video); }}
                >
                  <Download />
                </Button>
              </div>
              </div>
            </div>
          </div>
        )
      })}
      
      <div ref={loadMoreRef} className="h-20" />

      {/* Scroll Indicator */}
      {showScrollIndicator && (
        <div className="fixed left-1/2 bottom-20 transform -translate-x-1/2 z-40 pointer-events-none">
          <div className="flex items-center justify-center px-3 py-2 bg-black/40 backdrop-blur-sm rounded-2xl border border-white/20">
            <div className="relative w-0.5 h-12 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="absolute w-full h-6 bg-gradient-to-t from-white to-white/60 rounded-full"
                style={{ 
                  animation: 'slideUp 2s ease-in-out infinite 0.5s',
                }} 
              />
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slideUp {
            0% {
              transform: translateY(100%);
              opacity: 0;
            }
            50% {
              transform: translateY(-50%);
              opacity: 1;
            }
            100% {
              transform: translateY(-200%);
              opacity: 0;
            }
          }
        `
      }} />

      {(isLoading || isLoadingMore) && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}