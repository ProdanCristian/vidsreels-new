import { useEffect, useState } from 'react'
import { ChevronUp } from 'lucide-react'

interface ScrollIndicatorProps {
  isVisible?: boolean
  onDismiss?: () => void
}

export default function ScrollIndicator({ 
  isVisible = true,
  onDismiss 
}: ScrollIndicatorProps) {
  const [showHint, setShowHint] = useState(isVisible)

  useEffect(() => {
    if (isVisible) {
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setShowHint(false)
        onDismiss?.()
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [isVisible, onDismiss])

  if (!showHint) return null

  return (
    <div className="fixed inset-0 z-30 pointer-events-none">
      {/* Swipe Up Indicator */}
      <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 flex flex-col items-center animate-bounce">
        <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 mb-2">
          <p className="text-white text-sm font-medium">Swipe up for next video</p>
        </div>
        <ChevronUp className="text-white w-8 h-8 animate-pulse" />
      </div>


      {/* Animated gesture line */}
      <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
        <div className="relative h-32 w-1">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-transparent rounded-full animate-pulse"></div>
          <div className="absolute top-0 w-1 h-8 bg-white/80 rounded-full animate-ping"></div>
        </div>
      </div>

      {/* Tap to dismiss hint */}
      <div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 pointer-events-auto cursor-pointer"
        onClick={() => {
          setShowHint(false)
          onDismiss?.()
        }}
      >
        <div className="bg-black/40 backdrop-blur-sm rounded-full px-3 py-1">
          <p className="text-white/70 text-xs">Tap to dismiss</p>
        </div>
      </div>
    </div>
  )
} 