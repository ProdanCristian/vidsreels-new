interface LoadingSpinnerProps {
  isVisible: boolean
}

export default function LoadingSpinner({ isVisible }: LoadingSpinnerProps) {
  if (!isVisible) return null
  
  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
    </div>
  )
} 