import { Play } from 'lucide-react'
import { FastVideo } from './types'
import { useRef, useEffect, useState, useCallback } from 'react'

interface VideoPlayerProps {
  video: FastVideo
  index: number
  isActive: boolean
  globalMuted: boolean
  preload: 'auto' | 'metadata' | 'none'
  showPlayButton: boolean
  onTogglePlayPause: () => void
  onPlay: () => void
  onPause: () => void
  onError: () => void
  videoRef: (el: HTMLVideoElement | null) => void
}

export default function VideoPlayer({
  video,
  index,
  isActive,
  globalMuted,
  preload,
  showPlayButton,
  onTogglePlayPause,
  onPlay,
  onPause,
  onError,
  videoRef
}: VideoPlayerProps) {
  const internalVideoRef = useRef<HTMLVideoElement | null>(null)
  const timelineRef = useRef<HTMLDivElement | null>(null)
  const retryCountRef = useRef(0)
  const [progress, setProgress] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)

  // Set up ref callback to handle both internal ref and parent ref
  const setVideoRef = (el: HTMLVideoElement | null) => {
    internalVideoRef.current = el
    videoRef(el)
  }

  // Listen to actual video play/pause events to track real state
  useEffect(() => {
    const videoElement = internalVideoRef.current
    if (!videoElement) return

    const handlePlay = () => {
      retryCountRef.current = 0 // Reset retries on successful play
      onPlay()
    }

    const handlePause = () => {
      onPause()
    }
    
    const handleTimeUpdate = () => {
      if (!isSeeking && videoElement.duration > 0) {
        setProgress((videoElement.currentTime / videoElement.duration) * 100)
      }
    }

    const handleError = (e: Event) => {
      // Silently ignore errors for non-active videos.
      if (!isActive) {
        return
      }

      const maxRetries = 2
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++
        const delay = 500 * retryCountRef.current // 500ms, 1000ms
        setTimeout(() => {
          videoElement.load() // This tells the browser to reload the source
        }, delay)
        return // Stop here and don't propagate the error yet.
      }
      
      onError()
    }

    videoElement.addEventListener('play', handlePlay)
    videoElement.addEventListener('pause', handlePause)
    videoElement.addEventListener('timeupdate', handleTimeUpdate)
    videoElement.addEventListener('error', handleError)

    return () => {
      videoElement.removeEventListener('play', handlePlay)
      videoElement.removeEventListener('pause', handlePause)
      videoElement.removeEventListener('timeupdate', handleTimeUpdate)
      videoElement.removeEventListener('error', handleError)
    }
  }, [onPlay, onPause, isSeeking, onError, isActive])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !internalVideoRef.current?.duration) return

    const timeline = timelineRef.current
    const rect = timeline.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    
    let percentage = (clientX - rect.left) / rect.width
    percentage = Math.max(0, Math.min(1, percentage))

    const newTime = percentage * internalVideoRef.current.duration
    
    if (isFinite(newTime)) {
      internalVideoRef.current.currentTime = newTime
      setProgress(percentage * 100)
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setIsSeeking(true)
    handleSeek(e)

    const handleMouseMove = (moveEvent: MouseEvent) => {
      handleSeek(moveEvent as unknown as React.MouseEvent<HTMLDivElement>)
    }

    const handleMouseUp = () => {
      setIsSeeking(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [handleSeek])

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    setIsSeeking(true)
    handleSeek(e)

    const handleTouchMove = (moveEvent: TouchEvent) => {
      handleSeek(moveEvent as unknown as React.TouchEvent<HTMLDivElement>)
    }

    const handleTouchEnd = () => {
      setIsSeeking(false)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }

    window.addEventListener('touchmove', handleTouchMove)
    window.addEventListener('touchend', handleTouchEnd)
  }, [handleSeek])

  useEffect(() => {
    // When the video source changes, reset progress and retries.
    setProgress(0)
    retryCountRef.current = 0
  }, [video.directUrl])

  return (
    <>
      <video
          ref={setVideoRef}
          data-index={index}
          className="w-full h-full object-cover rounded-lg"
          controls={false}
          playsInline
          loop
          muted={globalMuted}
          preload={preload}
          crossOrigin="anonymous"
          onClick={onTogglePlayPause}
          onError={onError}
        >
        <source src={video.directUrl} type="video/mp4" />
        <p className="text-white text-center p-4">Video not supported</p>
      </video>
      
      {/* Play Button - Show when button state is true */}
      {showPlayButton && (
        <div 
          className="absolute inset-0 flex items-center justify-center z-50"
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 50
          }}
        >
                     <div
             className="w-20 h-20 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 flex items-center justify-center cursor-pointer "
             style={{
               pointerEvents: 'auto',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center'
             }}
            onClick={(e) => {
              e.stopPropagation()
              onTogglePlayPause()
            }}
          >
            <Play className="w-10 h-10 ml-1" fill="white" />
          </div>
        </div>
      )}

      {/* Video timeline */}
      <div 
        className="absolute bottom-4 left-4 right-4 h-1 bg-white/20 rounded-full cursor-pointer"
        ref={timelineRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div 
          className="h-full bg-white rounded-full" 
          style={{ width: `${progress}%` }} 
        />
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      </div>
    </>
  )
} 