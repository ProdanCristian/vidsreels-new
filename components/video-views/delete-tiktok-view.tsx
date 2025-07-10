"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { FastVideo, VideoResponse } from './types'
import LoadingSpinner from './loading-spinner'
import VideoPlayer from './video-player'
import ScrollIndicator from './scroll-indicator'
import { Button } from '@/components/ui/button'
import { Trash2, X, Check } from 'lucide-react'

interface DeleteTikTokViewProps {
  collectionId: string
  isShuffled?: boolean
}

// Delete TikTok View Component
export default function DeleteTikTokView({ collectionId, isShuffled }: DeleteTikTokViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const observerRef = useRef<IntersectionObserver | null>(null)
  const allVideosRef = useRef<FastVideo[]>([])
  
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
  
  // Delete states
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  
  // Persistent scroll position states
  const [shouldRestorePosition, setShouldRestorePosition] = useState(false)
  const [targetVideoId, setTargetVideoId] = useState<string | null>(null)
  const [hasRestoredOnce, setHasRestoredOnce] = useState(false)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  
  // Flag to prevent immediate observer changes on initial load
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  const fetcher = useCallback(async (url: string): Promise<VideoResponse> => {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch videos: ${response.statusText}`)
    return response.json()
  }, [])

  // LocalStorage keys (memoized to prevent infinite loops)
  const STORAGE_KEY = useMemo(() => `delete-videos-position-${collectionId}`, [collectionId])
  const DELETED_VIDEOS_KEY = useMemo(() => `deleted-videos-${collectionId}`, [collectionId])

  // Calculate initial limit based on saved position
  const getInitialLimit = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const savedPosition = JSON.parse(stored)
        if (savedPosition?.index && savedPosition.index > 0) {
          // Load enough videos to reach the saved position
          const videosNeeded = Math.max(savedPosition.index + 20, 30) // Load extra for smooth scrolling
          console.log('📊 Loading', videosNeeded, 'videos initially to reach saved position at index', savedPosition.index)
          return videosNeeded
        }
      }
    } catch (error) {
      console.warn('Failed to get initial limit:', error)
    }
    console.log('📊 Loading 10 videos initially (no saved position)')
    return 10
  }, [STORAGE_KEY])

  const initialLimit = getInitialLimit()
  
  const { data, isLoading } = useSWR<VideoResponse>(
    collectionId ? `/api/videos/${collectionId}?page=1&limit=${initialLimit}&shuffle=${isShuffled}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  )



  // Save deleted video to localStorage
  const saveDeletedVideoToStorage = useCallback((videoId: string) => {
    try {
      const stored = localStorage.getItem(DELETED_VIDEOS_KEY)
      const deletedVideos = stored ? JSON.parse(stored) : []
      if (!deletedVideos.includes(videoId)) {
        deletedVideos.push(videoId)
        localStorage.setItem(DELETED_VIDEOS_KEY, JSON.stringify(deletedVideos))
      }
    } catch (error) {
      console.warn('Failed to save deleted video to localStorage:', error)
    }
  }, [DELETED_VIDEOS_KEY])

  // Initialize videos when data loads
  useEffect(() => {
    if (data?.videos) {
      // Get deleted videos from localStorage directly to avoid function dependency
      let deletedVideos: string[] = []
      try {
        const stored = localStorage.getItem(DELETED_VIDEOS_KEY)
        deletedVideos = stored ? JSON.parse(stored) : []
      } catch (error) {
        console.warn('Failed to load deleted videos:', error)
      }
      
      const availableVideos = data.videos.filter(video => !deletedVideos.includes(video.id))
      
      setAllVideos(availableVideos)
      allVideosRef.current = availableVideos  // Keep ref in sync
      setHasMoreVideos(data.hasMore)
      // Calculate the correct page based on how many videos we loaded
      const actualPage = Math.ceil(availableVideos.length / 10)
      setCurrentPage(actualPage)
      videoRefs.current = new Array(availableVideos.length).fill(null)
      
      // Try to restore previous position
      let savedPosition = null
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        savedPosition = stored ? JSON.parse(stored) : null
      } catch (error) {
        console.warn('Failed to load position:', error)
      }
      
      if (savedPosition && availableVideos.length > 0) {
        console.log('🔄 Restoring position for video:', savedPosition.videoId, 'at index:', savedPosition.index)
        // Find the video by ID first
        const savedVideoIndex = availableVideos.findIndex(v => v.id === savedPosition.videoId)
        if (savedVideoIndex !== -1) {
          console.log('✅ Found saved video at index:', savedVideoIndex)
          setCurrentVideoIndex(savedVideoIndex)
          setTargetVideoId(savedPosition.videoId)
          setShouldRestorePosition(true)
        } else {
          // If the saved video was deleted, use the saved index as fallback
          const fallbackIndex = Math.min(savedPosition.index, availableVideos.length - 1)
          console.log('⚠️ Saved video not found, using fallback index:', fallbackIndex)
          setCurrentVideoIndex(fallbackIndex)
          setShouldRestorePosition(true)
        }
      } else {
        // Start at the first video
        console.log('🆕 Starting from beginning')
        setCurrentVideoIndex(0)
      }
      
      setIsInitialLoad(true)
    }
  }, [data, STORAGE_KEY, DELETED_VIDEOS_KEY])

  // Handle scroll restoration after videos are loaded - only once per session
  useEffect(() => {
    if (allVideos.length > 0 && isInitialLoad && !hasRestoredOnce && !isUserScrolling) {
      console.log('📍 Attempting scroll restoration, videos:', allVideos.length, 'shouldRestore:', shouldRestorePosition)
      setTimeout(() => {
        if (containerRef.current) {
          if (shouldRestorePosition) {
            if (targetVideoId) {
              // Restore to saved position by video ID
              const targetIndex = allVideos.findIndex(v => v.id === targetVideoId)
              if (targetIndex !== -1) {
                console.log('🎯 Scrolling to saved video at index:', targetIndex)
                const videoElement = containerRef.current.children[targetIndex] as HTMLElement
                if (videoElement) {
                  videoElement.scrollIntoView({ behavior: 'instant', block: 'center' })
                }
              } else {
                console.log('❌ Target video not found, scrolling to current index:', currentVideoIndex)
                const videoElement = containerRef.current.children[currentVideoIndex] as HTMLElement
                if (videoElement) {
                  videoElement.scrollIntoView({ behavior: 'instant', block: 'center' })
                }
              }
            } else {
              // Restore to current index
              console.log('📍 Scrolling to current index:', currentVideoIndex)
              const videoElement = containerRef.current.children[currentVideoIndex] as HTMLElement
              if (videoElement) {
                videoElement.scrollIntoView({ behavior: 'instant', block: 'center' })
              }
            }
            setShouldRestorePosition(false)
            setTargetVideoId(null)
            setHasRestoredOnce(true) // Mark that we've restored once
          } else {
            // Scroll to current video position or top
            if (currentVideoIndex > 0) {
              console.log('📍 Scrolling to index:', currentVideoIndex)
              const videoElement = containerRef.current.children[currentVideoIndex] as HTMLElement
              if (videoElement) {
                videoElement.scrollIntoView({ behavior: 'instant', block: 'center' })
              }
            } else {
              console.log('📍 Scrolling to top')
              containerRef.current.scrollTop = 0
            }
            setHasRestoredOnce(true) // Mark that we've restored once
          }
        }
        // Allow intersection observer to work after initial setup
        setTimeout(() => {
          setIsInitialLoad(false)
        }, 500)
      }, 300)  // Increased delay to ensure DOM is ready
    }
  }, [allVideos.length, isInitialLoad, shouldRestorePosition, targetVideoId, currentVideoIndex, hasRestoredOnce, isUserScrolling])

  // Detect user scrolling to prevent automatic restoration during scroll
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let scrollTimeout: NodeJS.Timeout

    const handleScroll = () => {
      if (!isInitialLoad && !hasRestoredOnce) {
        setIsUserScrolling(true)
        console.log('👆 User is scrolling - preventing automatic restoration')
        
        // Clear timeout if user continues scrolling
        if (scrollTimeout) {
          clearTimeout(scrollTimeout)
        }
        
        // Reset user scrolling flag after scroll ends
        scrollTimeout = setTimeout(() => {
          setIsUserScrolling(false)
        }, 200)
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
    }
  }, [isInitialLoad, hasRestoredOnce])

  // Save position to localStorage whenever currentVideoIndex changes
  useEffect(() => {
    if (allVideosRef.current.length > 0 && currentVideoIndex >= 0 && currentVideoIndex < allVideosRef.current.length && !isInitialLoad) {
      const currentVideo = allVideosRef.current[currentVideoIndex]
      if (currentVideo) {
        // Save directly to localStorage to avoid dependency issues
        try {
          const positionData = {
            videoId: currentVideo.id,
            index: currentVideoIndex,
            timestamp: Date.now()
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(positionData))
          console.log('💾 Saved position:', currentVideo.id, 'at index:', currentVideoIndex)
        } catch (error) {
          console.warn('Failed to save position to localStorage:', error)
        }
      }
    }
  }, [currentVideoIndex, isInitialLoad, STORAGE_KEY])

  // Reset state when shuffle changes
  useEffect(() => {
    if (isShuffled) {
      // Clear saved position since shuffle changes video order
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch (error) {
        console.warn('Failed to clear saved position:', error)
      }
      
      setAllVideos([])
      allVideosRef.current = []
      setCurrentVideoIndex(0)
      setCurrentPage(1)
      setHasMoreVideos(true)
      setShowScrollHint(true)
      setHasUserScrolled(false)
      setIsInitialLoad(true)
      setHasRestoredOnce(false)
      setIsUserScrolling(false)
      setShouldRestorePosition(false)
      setTargetVideoId(null)
    }
  }, [isShuffled, STORAGE_KEY])

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
      // This catch is important for mobile autoplay issues.
      // Browsers often block `play()` if not initiated by user action or if the video isn't ready.
      if (error instanceof Error) {
        console.warn(`Autoplay for video ${index} was prevented. Error: ${error.name} - ${error.message}`)
      } else {
        console.warn(`An unknown autoplay error occurred for video ${index}.`)
      }
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
      const url = `/api/videos/${collectionId}?page=${nextPage}&limit=10&shuffle=${isShuffled}`
      const response = await fetcher(url)

      if (response.videos.length > 0) {
        setAllVideos(prev => {
          const newVideos = [...prev, ...response.videos]
          videoRefs.current = [...videoRefs.current, ...new Array(response.videos.length).fill(null)]
          
          // Update ref to keep in sync
          allVideosRef.current = newVideos
          
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

  // Delete video function
  const deleteVideo = useCallback(async (videoId: string) => {
    setIsDeleting(true)
    setDeleteError(null)
    
    try {
      // Find the index of the video being deleted
      const deletedIndex = allVideos.findIndex(v => v.id === videoId)
      const wasCurrentVideo = deletedIndex === currentVideoIndex
      
      const response = await fetch(`/api/videos/${collectionId}?videoId=${videoId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to delete video')
      }
      
      // Remove video from local state and maintain order
      setAllVideos(prev => {
        const newVideos = prev.filter(video => video.id !== videoId)
        
        // Update video refs array to match the new videos array
        const newVideoRefs = videoRefs.current.filter((_, index) => prev[index]?.id !== videoId)
        videoRefs.current = newVideoRefs
        
        // Update ref to keep in sync
        allVideosRef.current = newVideos
        
        return newVideos
      })
      
      // Adjust current video index to maintain position
      setCurrentVideoIndex(prev => {
        // If we deleted a video before the current one, shift index back
        if (deletedIndex < prev) {
          return prev - 1
        }
        // If we deleted the current video, stay at the same index (next video moves up)
        else if (deletedIndex === prev) {
          // If we're at the end and deleted the last video, go to the previous one
          return Math.min(prev, allVideos.length - 2) // -2 because we removed one video
        }
        // If we deleted a video after the current one, no change needed
        else {
          return prev
        }
      })
      
      // Save deleted video to localStorage
      saveDeletedVideoToStorage(videoId)
      
      // If we deleted the current video, scroll to the next video smoothly
      if (wasCurrentVideo && containerRef.current) {
        setTimeout(() => {
          const newIndex = Math.min(currentVideoIndex, allVideos.length - 2)
          const videoElement = containerRef.current?.children[newIndex] as HTMLElement
          if (videoElement) {
            videoElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
      
    } catch (error) {
      console.error('Failed to delete video:', error)
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete video')
    } finally {
      setIsDeleting(false)
      setSelectedVideoId(null)
    }
  }, [collectionId, allVideos, currentVideoIndex, saveDeletedVideoToStorage])

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
        
        // Don't change video index during initial load, restoration, or user scrolling to prevent unwanted switching
        if (!isInitialLoad && hasRestoredOnce && !isUserScrolling) {
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
  }, [allVideos.length, hasUserScrolled, isInitialLoad, hasRestoredOnce, isUserScrolling]) // Dependencies are simplified for stability.

  // Autoplay current video with readiness check
  useEffect(() => {
    const video = videoRefs.current[currentVideoIndex];
    if (!video || !video.paused) {
      return;
    }

    // This function will be called to attempt playback.
    const attemptPlay = () => {
      playVideo(currentVideoIndex);
    };

    // readyState >= 3 means the video has enough data to start playing.
    if (video.readyState >= 3) {
      attemptPlay();
    } else {
      // If the video is not ready, we wait for the 'canplay' event.
      // This is the browser telling us it's now safe to call .play()
      const onCanPlay = () => {
        attemptPlay();
      };
      
      // We use `{ once: true }` to ensure the event listener is automatically removed
      // after it fires, preventing memory leaks.
      video.addEventListener('canplay', onCanPlay, { once: true });

      // The cleanup function for this effect will remove the listener if the user
      // scrolls away before the video becomes playable.
      return () => {
        video.removeEventListener('canplay', onCanPlay);
      };
    }
  }, [currentVideoIndex, playVideo]);

  // Load more videos when needed (when user is 5 videos away from the end)
  useEffect(() => {
    if (currentVideoIndex >= allVideos.length - 5 && hasMoreVideos && !isLoadingMore) {
      loadMoreVideos()
    }
  }, [currentVideoIndex, allVideos.length, hasMoreVideos, isLoadingMore, loadMoreVideos])

  // Note: Download functionality removed for delete view

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
            data-index={index}
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
                    }
                    videoRefs.current[index] = el 
                  }}
                />

                {/* Delete Controls */}
                <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                  {/* Delete Button */}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setSelectedVideoId(video.id)}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Delete Confirmation Modal */}
                {selectedVideoId === video.id && (
                  <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Delete Video?
                      </h3>
                                             <p className="text-gray-600 mb-6">
                         This will permanently delete &quot;{video.name}&quot; from storage and database. This action cannot be undone.
                       </p>
                      {deleteError && (
                        <p className="text-red-600 text-sm mb-4">{deleteError}</p>
                      )}
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedVideoId(null)
                            setDeleteError(null)
                          }}
                          disabled={isDeleting}
                          className="flex-1"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => deleteVideo(video.id)}
                          disabled={isDeleting}
                          className="flex-1"
                        >
                          {isDeleting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Delete
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mute/Unmute Button */}
                <div className="absolute bottom-4 left-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleGlobalMute}
                    className="bg-black bg-opacity-50 text-white border-gray-600 hover:bg-gray-800"
                  >
                    {globalMuted ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    )}
                  </Button>
                </div>
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

      {/* Position restoration indicator */}
      {shouldRestorePosition && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-black bg-opacity-90 text-white px-6 py-3 rounded-lg border border-gray-600">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span className="text-sm">Restoring your position...</span>
          </div>
        </div>
      )}

      {/* Global loading spinner only for initial load */}
      {isLoading && <LoadingSpinner isVisible={true} />}
    </div>
  )
} 