import { Button } from '@/components/ui/button'
import { Download, Volume2, VolumeX } from 'lucide-react'

interface VideoControlsProps {
  globalMuted: boolean
  onToggleMute: () => void
  onDownload: () => void
}

export default function VideoControls({ globalMuted, onToggleMute, onDownload }: VideoControlsProps) {
  return (
    <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-4">
      <Button
        variant="ghost"
        size="icon"
        className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60"
        onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
      >
        {globalMuted ? <VolumeX /> : <Volume2 />}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60"
        onClick={(e) => { e.stopPropagation(); onDownload(); }}
      >
        <Download />
      </Button>
    </div>
  )
} 