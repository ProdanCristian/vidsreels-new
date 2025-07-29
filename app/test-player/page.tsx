"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, RefreshCw } from 'lucide-react'
import YouTube from 'react-youtube'

interface YoutubePlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  stopVideo: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
}

interface YouTubePlayerEvent {
  target: YoutubePlayer;
  data: number;
}

interface YouTubePlayerError {
  data: number;
}

// Test video IDs - mix of different types to test restrictions
const TEST_VIDEOS = [
  { id: 'dQw4w9WgXcQ', title: 'Rick Astley - Never Gonna Give You Up', type: 'Music Video' },
  { id: 'kJQP7kiw5Fk', title: 'Despacito', type: 'Popular Music' },
  { id: 'fJ9rUzIMcZQ', title: 'Bohemian Rhapsody', type: 'Classic Rock' },
  { id: 'YQHsXMglC9A', title: 'Adele - Hello', type: 'Pop Music' },
  { id: 'CevxZvSJLk8', title: 'Katy Perry - Roar', type: 'Pop Music' },
  { id: '9bZkp7q19f0', title: 'PSY - GANGNAM STYLE', type: 'K-Pop' }
]

// Different player configurations to test
const PLAYER_CONFIGS = [
  {
    name: 'Standard Config',
    config: {
      autoplay: 1,
      controls: 0,
      rel: 0,
      showinfo: 0,
      modestbranding: 1,
      iv_load_policy: 3,
      fs: 0,
      disablekb: 1,
      enablejsapi: 1,
    }
  },
  {
    name: 'No Origin',
    config: {
      autoplay: 1,
      controls: 0,
      rel: 0,
      showinfo: 0,
      modestbranding: 1,
      iv_load_policy: 3,
      fs: 0,
      disablekb: 1,
      enablejsapi: 1,
      cc_load_policy: 0,
      hl: 'en',
    }
  },
  {
    name: 'Privacy Enhanced',
    config: {
      autoplay: 1,
      controls: 0,
      rel: 0,
      showinfo: 0,
      modestbranding: 1,
      iv_load_policy: 3,
      fs: 0,
      disablekb: 1,
      enablejsapi: 1,
      host: 'https://www.youtube-nocookie.com',
      cc_load_policy: 0,
      hl: 'en',
    }
  },
  {
    name: 'Minimal Config',
    config: {
      autoplay: 1,
      enablejsapi: 1,
      controls: 0,
    }
  },
  {
    name: 'Network Origin Fix',
    config: {
      autoplay: 1,
      controls: 0,
      rel: 0,
      showinfo: 0,
      modestbranding: 1,
      iv_load_policy: 3,
      fs: 0,
      disablekb: 1,
      enablejsapi: 1,
      cc_load_policy: 0,
      hl: 'en',
      playsinline: 1,
      // Removed origin and widget_referrer to avoid network IP issues
    }
  },
  {
    name: 'Localhost Origin Only',
    config: {
      autoplay: 1,
      controls: 0,
      rel: 0,
      showinfo: 0,
      modestbranding: 1,
      iv_load_policy: 3,
      fs: 0,
      disablekb: 1,
      enablejsapi: 1,
      cc_load_policy: 0,
      hl: 'en',
      origin: 'http://localhost:3000',
      widget_referrer: 'http://localhost:3000',
      playsinline: 1,
    }
  },
  {
    name: 'Force NoReferer',
    config: {
      autoplay: 1,
      controls: 0,
      enablejsapi: 1,
      rel: 0,
      modestbranding: 1,
      fs: 0,
      disablekb: 1,
      cc_load_policy: 0,
    }
  },
  {
    name: 'Maximum Bypass',
    config: {
      autoplay: 1,
      controls: 0,
      enablejsapi: 1,
      playsinline: 1,
      // Absolutely minimal config - no origin, no referrer, no restrictions
    }
  },
  {
    name: 'Custom Domain Spoof',
    config: {
      autoplay: 1,
      controls: 0,
      rel: 0,
      showinfo: 0,
      modestbranding: 1,
      iv_load_policy: 3,
      fs: 0,
      disablekb: 1,
      enablejsapi: 1,
      cc_load_policy: 0,
      hl: 'en',
      origin: 'https://example.com',
      widget_referrer: 'https://example.com',
      playsinline: 1,
    }
  }
]

export default function TestPlayerPage() {
  const [selectedVideo, setSelectedVideo] = useState(TEST_VIDEOS[0])
  const [selectedConfig, setSelectedConfig] = useState(PLAYER_CONFIGS[0])
  const [isPlaying, setIsPlaying] = useState(false)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [playerKey, setPlayerKey] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentOrigin, setCurrentOrigin] = useState('')

  // Get current origin on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin)
    }
  }, [])

  const playerRef = useRef<YoutubePlayer | null>(null)

  // Add log entry
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]) // Keep last 20 logs
  }

  // Update time
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isPlaying && playerRef.current && isPlayerReady) {
      interval = setInterval(() => {
        try {
          if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
            const current = playerRef.current.getCurrentTime()
            const total = playerRef.current.getDuration()
            
            if (current !== undefined && !isNaN(current)) {
              setCurrentTime(current)
            }
            if (total !== undefined && total > 0 && !isNaN(total)) {
              setDuration(total)
            }
          }
        } catch (error) {
          console.log('Error updating time:', error)
        }
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isPlaying, isPlayerReady])

  // Format time
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Load video with selected config
  const loadVideo = () => {
    addLog(`Loading: ${selectedVideo.title} with ${selectedConfig.name}`)
    setPlayerError(null)
    setIsPlayerReady(false)
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
    playerRef.current = null
    setPlayerKey(prev => prev + 1)
  }

  // Manual play/pause
  const togglePlayback = () => {
    if (playerRef.current) {
      try {
        if (isPlaying) {
          playerRef.current.pauseVideo()
        } else {
          playerRef.current.playVideo()
        }
      } catch (e) {
        addLog(`Playback control failed: ${e}`)
      }
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-center">YouTube Player Test Lab</h1>
        <div className="text-center mb-8 bg-gray-900 p-4 rounded-lg">
          <div className="text-sm text-gray-400 mb-2">Current Access URL:</div>
          <div className="font-mono text-blue-400">{currentOrigin}</div>
          <div className="text-xs text-gray-500 mt-2">
            {currentOrigin.includes('localhost') ? '✅ Localhost access' : '⚠️ Network access - this may cause YouTube origin issues'}
          </div>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Controls Panel */}
          <div className="space-y-6">
            {/* Video Selection */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Test Video</h2>
              <div className="grid gap-2">
                {TEST_VIDEOS.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => setSelectedVideo(video)}
                    className={`p-3 rounded text-left transition-all ${
                      selectedVideo.id === video.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    <div className="font-medium">{video.title}</div>
                    <div className="text-sm opacity-70">{video.type} • {video.id}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Config Selection */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Player Configuration</h2>
              <div className="grid gap-2">
                {PLAYER_CONFIGS.map((config, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedConfig(config)}
                    className={`p-3 rounded text-left transition-all ${
                      selectedConfig.name === config.name
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    <div className="font-medium">{config.name}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {Object.keys(config.config).join(', ')}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Load Button */}
            <Button 
              onClick={loadVideo}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 text-lg"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Load Video with Selected Config
            </Button>

            {/* Player Controls */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Player Status</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Ready:</span>
                  <span className={isPlayerReady ? 'text-green-400' : 'text-red-400'}>
                    {isPlayerReady ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Playing:</span>
                  <span className={isPlaying ? 'text-green-400' : 'text-gray-400'}>
                    {isPlaying ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Time:</span>
                  <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Error:</span>
                  <span className={playerError ? 'text-red-400' : 'text-green-400'}>
                    {playerError || 'None'}
                  </span>
                </div>
              </div>
              
              <Button 
                onClick={togglePlayback}
                disabled={!isPlayerReady}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Play
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Logs Panel */}
          <div className="space-y-6">
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Event Logs</h2>
              <div className="bg-black p-4 rounded h-96 overflow-y-auto font-mono text-sm">
                {logs.length === 0 ? (
                  <div className="text-gray-500">No logs yet. Load a video to see events.</div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1 text-green-400">
                      {log}
                    </div>
                  ))
                )}
              </div>
              <Button 
                onClick={() => setLogs([])}
                className="mt-3 bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2"
              >
                Clear Logs
              </Button>
            </div>

            {/* Current Config Display */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Current Configuration</h2>
              <pre className="bg-black p-4 rounded text-sm overflow-x-auto">
                {JSON.stringify(selectedConfig.config, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Hidden YouTube Player */}
        <div className="hidden">
          <YouTube
            key={`${selectedVideo.id}-${selectedConfig.name}-${playerKey}`}
            videoId={selectedVideo.id}
            opts={{
              width: '1',
              height: '1',
              playerVars: {
                ...selectedConfig.config,
                // Only add origin if the config doesn't already have it
                ...(selectedConfig.config.origin === undefined && selectedConfig.name !== 'Maximum Bypass' && selectedConfig.name !== 'Force NoReferer' ? {
                  origin: typeof window !== 'undefined' ? window.location.origin : ''
                } : {})
              },
            }}
            onReady={(event: YouTubePlayerEvent) => {
              addLog('Player ready event fired')
              playerRef.current = event.target
              setIsPlayerReady(true)
              
              try {
                const total = event.target.getDuration()
                if (total > 0) {
                  setDuration(total)
                  addLog(`Duration: ${formatTime(total)}`)
                }
              } catch (e) {
                addLog(`Error getting duration: ${e}`)
              }
            }}
            onPlay={() => {
              addLog('Play event fired')
              setIsPlaying(true)
            }}
            onPause={() => {
              addLog('Pause event fired')
              setIsPlaying(false)
            }}
            onEnd={() => {
              addLog('End event fired')
              setIsPlaying(false)
            }}
            onError={(error) => {
              const playerError = error as YouTubePlayerError;
              const errorCode = playerError?.data
              const errorMessage = `Error ${errorCode}: ${getErrorMessage(errorCode)}`
              addLog(`ERROR: ${errorMessage}`)
              setPlayerError(errorMessage)
              setIsPlaying(false)
              setIsPlayerReady(false)
            }}
            onStateChange={(event) => {
              const states = {
                '-1': 'unstarted',
                '0': 'ended',
                '1': 'playing',
                '2': 'paused',
                '3': 'buffering',
                '5': 'video cued'
              }
              const stateName = states[String(event.data) as keyof typeof states] || `unknown (${event.data})`
              addLog(`State changed: ${stateName}`)
            }}
          />
        </div>
      </div>
    </div>
  )
}

// Helper function to get error message
function getErrorMessage(errorCode: number | undefined): string {
  switch (errorCode) {
    case 2: return 'Invalid video ID'
    case 5: return 'HTML5 player error'
    case 100: return 'Video not found or private'
    case 101: return 'Video unavailable (embed restricted)'
    case 150: return 'Video unavailable (embed restricted)'
    default: return 'Unknown error'
  }
}