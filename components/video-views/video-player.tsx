import { Play } from 'lucide-react'
import { FastVideo } from './types'
import { useRef, useEffect, useState, useCallback } from 'react'

interface VideoPlayerProps {
  video: FastVideo
  index: number
  isFailed: boolean
  globalMuted: boolean
  preload: 'auto' | 'metadata' | 'none'
  onTogglePlayPause: () => void
  onPlay: () => void
  onPause: () => void
  onError: () => void
  videoRef: (el: HTMLVideoElement | null) => void
}

export default function VideoPlayer({
  video,
  index,
  isFailed,
  globalMuted,
  preload,
  onTogglePlayPause,
  onPlay,
  onPause,
  onError,
  videoRef
}: VideoPlayerProps) {
  const internalVideoRef = useRef<HTMLVideoElement | null>(null)
  const timelineRef = useRef<HTMLDivElement | null>(null)
  const [showPlayButton, setShowPlayButton] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)

  // Set up ref callback to handle both internal ref and parent ref
  const setVideoRef = (el: HTMLVideoElement | null) => {
    internalVideoRef.current = el
    videoRef(el)
  }

  // Listen to actual video play/pause events to track real state
  useEffect(() => {
    const video = internalVideoRef.current
    if (!video) return

    const handlePlay = () => {
      setShowPlayButton(false)
      onPlay()
    }

    const handlePause = () => {
      // Check the 'data-pause-reason' attribute to see if it was a manual pause
      if (video.dataset.pauseReason === 'manual') {
        setShowPlayButton(true)
      } else {
        setShowPlayButton(false)
      }
      // Reset the reason
      video.dataset.pauseReason = 'auto'
      onPause()
    }
    
    const handleTimeUpdate = () => {
      if (!isSeeking && video.duration > 0) {
        setProgress((video.currentTime / video.duration) * 100)
      }
    }

    const handleError = (e: Event) => {
      const target = e.target as HTMLVideoElement
      
      // Safely extract error information to avoid circular references
      const errorInfo = {
        errorCode: target.error?.code || 'unknown',
        errorMessage: target.error?.message || 'unknown error',
        networkState: target.networkState,
        readyState: target.readyState,
        videoSrc: target.src,
        currentTime: target.currentTime,
        duration: target.duration || 0,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        connectionType: (navigator as unknown as { connection?: { effectiveType?: string } }).connection?.effectiveType || 'unknown',
        timestamp: new Date().toISOString()
      }
      
      console.error('🚨 Video Error Details:', errorInfo)
      
      // Map error codes to human-readable messages
      const errorMessages: Record<number, string> = {
        1: 'MEDIA_ERR_ABORTED - Video loading was aborted',
        2: 'MEDIA_ERR_NETWORK - Network error occurred',
        3: 'MEDIA_ERR_DECODE - Video decoding error',
        4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - Video format not supported'
      }
      
      const errorCode = target.error?.code
      if (errorCode && errorMessages[errorCode]) {
        console.error('📋 Error explanation:', errorMessages[errorCode])
      }
      
      onError()
    }

    const handleLoadStart = () => {
      console.log('📱 Video load started:', {
        src: video.src,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      })
    }

    const handleCanPlay = () => {
      console.log('✅ Video can play:', video.src)
    }

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('error', handleError)
    video.addEventListener('loadstart', handleLoadStart)
    video.addEventListener('canplay', handleCanPlay)

    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('error', handleError)
      video.removeEventListener('loadstart', handleLoadStart)
      video.removeEventListener('canplay', handleCanPlay)
    }
  }, [onPlay, onPause, isSeeking, onError])

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
    // When the video source changes, reset the progress.
    setProgress(0)
  }, [video.directUrl])

  if (isFailed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-white rounded-lg p-4 text-center">
        <p className="font-semibold">Could not load video</p>
        <p className="text-sm text-zinc-400">{video.name}</p>
      </div>
    )
  }

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
              console.log('▶️ Play button clicked')
              onTogglePlayPause()
            }}
          >
            <Play className="w-10 h-10 ml-1" fill="white" />
          </div>
        </div>
      )}

      {/* Video timeline */}
      <div
        ref={timelineRef}
        className="absolute bottom-2 left-4 right-4 h-1 bg-white/20 cursor-pointer group rounded-full backdrop-blur-sm"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Background track */}
        <div className="absolute inset-0 bg-white/10 rounded-full"></div>
        
        {/* Progress bar */}
        <div 
          className="h-full bg-white relative rounded-full transition-all duration-150 ease-out"
          style={{ width: `${progress}%` }}
        >
          {/* Handle */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out transform scale-75 group-hover:scale-100 border-2 border-white/20"></div>
        </div>
        
        {/* Hover effect overlay */}
        <div className="absolute inset-0 bg-white/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
      </div>
    </>
  )
} 