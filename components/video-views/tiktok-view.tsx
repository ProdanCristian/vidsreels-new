"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import useSWR from 'swr'
import { FastVideo, VideoResponse, TikTokViewProps } from './types'
import LoadingSpinner from './loading-spinner'
import VideoControls from './video-controls'
import ScrollIndicator from './scroll-indicator'
import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'

// A self-contained component for each video item
function VideoItem({ 
  video, 
  isCurrent,
  isPlaying,
  onTogglePlay,
  onDownload,
  onToggleMute,
  failedThumbnails,
  setFailedThumbnails,
  globalMuted,
  videoRef,
  itemRef,
}: {
  video: FastVideo
  isCurrent: boolean
  isPlaying: boolean
  onTogglePlay: () => void
  onDownload: () => void
  onToggleMute: () => void
  failedThumbnails: Set<string>
  setFailedThumbnails: React.Dispatch<React.SetStateAction<Set<string>>>
  globalMuted: boolean
  videoRef: (el: HTMLVideoElement | null) => void
  itemRef: (el: HTMLDivElement | null) => void
}) {
  const hasThumbnailFailed = failedThumbnails.has(video.thumbnailUrl || video.directUrl)
  const thumbnailUrl = hasThumbnailFailed ? '/video-placeholder.png' : video.thumbnailUrl || video.directUrl

  return (
    <div
      ref={itemRef}
      className="w-full h-full relative flex items-center justify-center"
      style={{ scrollSnapAlign: 'center' }}
    >
      <div 
        className="relative w-full h-full max-w-sm max-h-[680px] mx-auto bg-black rounded-lg overflow-hidden flex items-center justify-center p-4" 
        style={{ aspectRatio: '9/16' }}
      >
        <div className="relative w-full h-full bg-black rounded-lg overflow-hidden group">
          
          <video
            ref={videoRef}
            src={video.directUrl}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-300',
              isPlaying ? 'opacity-100' : 'opacity-0'
            )}
            loop
            playsInline
            muted={globalMuted}
            onClick={onTogglePlay}
          />

          <div 
            className={cn(
              "absolute inset-0 transition-opacity duration-300 w-full h-full",
              isPlaying ? 'opacity-0 pointer-events-none' : 'opacity-100'
            )}
            onClick={onTogglePlay}
          >
            <Image
              src={thumbnailUrl}
              alt={video.name}
              fill
              sizes="(max-width: 480px) 100vw, 480px"
              className="object-cover w-full h-full"
              priority={isCurrent}
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
              onError={() => {
                if (hasThumbnailFailed) return
                setFailedThumbnails(prev => new Set(prev).add(thumbnailUrl))
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="bg-black/50 backdrop-blur-sm rounded-full p-4">
                <Play className="w-12 h-12 text-white" fill="white" />
              </div>
            </div>
          </div>
          
          <VideoControls
            globalMuted={globalMuted}
            onToggleMute={onToggleMute}
            onDownload={onDownload}
          />
        </div>
      </div>
    </div>
  )
}


// Main TikTok View Component
export default function TikTokView({ collectionId, onVideoDownload, isShuffled }: TikTokViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const videoItemRefs = useRef<(HTMLDivElement | null)[]>([])
  const scrollEndTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null)
  
  const [allVideos, setAllVideos] = useState<FastVideo[]>([])
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [globalMuted, setGlobalMuted] = useState(false)
  
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreVideos, setHasMoreVideos] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  
  const [showScrollHint, setShowScrollHint] = useState(true)
  const [hasUserScrolled, setHasUserScrolled] = useState(false)
  
  const [failedThumbnails, setFailedThumbnails] = useState<Set<string>>(new Set())
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)

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

  const playVideo = useCallback((index: number) => {
    if (playingIndex !== null && playingIndex !== index) {
      videoRefs.current[playingIndex]?.pause()
    }
    const newVideo = videoRefs.current[index]
    if (newVideo) {
      newVideo.muted = globalMuted
      newVideo.play().catch(err => console.error("Play failed", err))
    }
    setPlayingIndex(index)
  }, [playingIndex, globalMuted])

  const pauseVideo = useCallback((index: number) => {
    videoRefs.current[index]?.pause()
    if (playingIndex === index) {
      setPlayingIndex(null)
    }
  }, [playingIndex])
  
  const handleTogglePlay = useCallback((index: number) => {
    if (playingIndex === index) {
      pauseVideo(index)
    } else {
      playVideo(index)
    }
  }, [playingIndex, playVideo, pauseVideo])
  
  useEffect(() => {
    if (data?.videos) {
      setAllVideos(data.videos)
      setHasMoreVideos(data.hasMore)
      setCurrentPage(data.page)
      setPlayingIndex(null)
      setFailedThumbnails(new Set())
      videoRefs.current = new Array(data.videos.length).fill(null)
      videoItemRefs.current = new Array(data.videos.length).fill(null)
      if (containerRef.current) containerRef.current.scrollTop = 0
    }
  }, [data])

  useEffect(() => {
    if (isShuffled) {
      setAllVideos([])
      setCurrentVideoIndex(0)
      setCurrentPage(1)
      setHasMoreVideos(true)
      setShowScrollHint(true)
      setHasUserScrolled(false)
      setFailedThumbnails(new Set())
      setPlayingIndex(null)
    }
  }, [isShuffled])

  const toggleGlobalMute = useCallback(() => {
    setGlobalMuted(prev => {
      const newMuted = !prev
      if (playingIndex !== null) {
        const video = videoRefs.current[playingIndex]
        if (video) video.muted = newMuted
      }
      return newMuted
    })
  }, [playingIndex])

  const loadMoreVideos = useCallback(async () => {
    if (isLoadingMore || !hasMoreVideos) return
    setIsLoadingMore(true)
    try {
      const nextPage = currentPage + 1
      const url = `/api/videos/${collectionId}?page=${nextPage}&limit=10&shuffle=${isShuffled}`
      const response = await fetcher(url)
      if (response.videos.length > 0) {
        setAllVideos(prev => [...prev, ...response.videos])
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

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      if (playingIndex !== null) {
        const videoWrapper = videoItemRefs.current[playingIndex]
        if (videoWrapper) {
          const rect = videoWrapper.getBoundingClientRect()
          const containerRect = container.getBoundingClientRect()
          if (rect.bottom <= containerRect.top || rect.top >= containerRect.bottom) {
            pauseVideo(playingIndex)
          }
        }
      }

      if (scrollEndTimeoutRef.current) clearTimeout(scrollEndTimeoutRef.current)
      
      scrollEndTimeoutRef.current = setTimeout(() => {
        const containerRect = container.getBoundingClientRect()
        let closestIndex = -1
        let closestDistance = Infinity
        videoItemRefs.current.forEach((item, index) => {
          if (item) {
            const rect = item.getBoundingClientRect()
            const center = rect.top + rect.height / 2
            const distance = Math.abs(center - (containerRect.top + containerRect.height / 2))
            if (distance < closestDistance) {
              closestDistance = distance
              closestIndex = index
            }
          }
        })
        if (closestIndex !== -1 && currentVideoIndex !== closestIndex) {
          if (!hasUserScrolled) setHasUserScrolled(true)
          setCurrentVideoIndex(closestIndex)
        }
      }, 150)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      if (container) container.removeEventListener('scroll', handleScroll)
      if (scrollEndTimeoutRef.current) clearTimeout(scrollEndTimeoutRef.current)
    }
  }, [currentVideoIndex, hasUserScrolled, playingIndex, pauseVideo])
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreVideos && !isLoadingMore) {
          loadMoreVideos()
        }
      },
      { root: containerRef.current, rootMargin: '200% 0px' }
    )
    const trigger = loadMoreTriggerRef.current
    if (trigger) observer.observe(trigger)
    return () => { if (trigger) observer.unobserve(trigger) }
  }, [hasMoreVideos, isLoadingMore, loadMoreVideos])

  return (
    <div 
      ref={containerRef}
      className="fixed top-16 sm:top-20 left-0 right-0 bottom-0 overflow-y-auto bg-black"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', scrollSnapType: 'y mandatory' }}
    >
      {allVideos.map((video, index) => (
        <VideoItem
          key={`${video.id}-${index}`}
          video={video}
          isCurrent={index === currentVideoIndex}
          isPlaying={playingIndex === index}
          onTogglePlay={() => handleTogglePlay(index)}
          onDownload={() => onVideoDownload(video.directUrl, `${video.name.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`)}
          onToggleMute={toggleGlobalMute}
          failedThumbnails={failedThumbnails}
          setFailedThumbnails={setFailedThumbnails}
          globalMuted={globalMuted}
          videoRef={(el) => { videoRefs.current[index] = el }}
          itemRef={(el) => { videoItemRefs.current[index] = el }}
        />
      ))}
      
      {hasMoreVideos && !isLoadingMore && (
        <div ref={loadMoreTriggerRef} style={{ height: '200px' }} />
      )}

      <ScrollIndicator 
        isVisible={showScrollHint && allVideos.length > 1}
        onDismiss={() => setShowScrollHint(false)}
      />

      {(isLoading || isLoadingMore) && <LoadingSpinner isVisible={true} />}
    </div>
  )
}