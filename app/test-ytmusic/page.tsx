"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, RefreshCw, Search } from 'lucide-react'
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
}

interface YouTubePlayerError {
  data: number;
}

interface MusicTrack {
  id: string;
  name: string;
  url: string;
  thumbnail: string;
  duration: string;
  artist: string;
}

// YouTube Music specific configurations
const YTMUSIC_CONFIGS = [
  {
    name: 'Standard YT Music',
    description: 'Convert music.youtube.com to regular youtube.com embed',
    convertUrl: (musicUrl: string) => {
      const videoId = musicUrl.match(/v=([^&]+)/)?.[1]
      return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&enablejsapi=1&playsinline=1` : null
    },
    playerConfig: {
      autoplay: 1,
      controls: 0,
      enablejsapi: 1,
      playsinline: 1,
    }
  },
  {
    name: 'YT Music NoCooke',
    description: 'Use youtube-nocookie.com domain',
    convertUrl: (musicUrl: string) => {
      const videoId = musicUrl.match(/v=([^&]+)/)?.[1]
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=0&enablejsapi=1&playsinline=1` : null
    },
    playerConfig: {
      autoplay: 1,
      controls: 0,
      enablejsapi: 1,
      playsinline: 1,
    }
  },
  {
    name: 'Music Minimal',
    description: 'Minimal config for YouTube Music videos',
    convertUrl: (musicUrl: string) => {
      const videoId = musicUrl.match(/v=([^&]+)/)?.[1]
      return videoId
    },
    playerConfig: {
      autoplay: 1,
      enablejsapi: 1,
    }
  },
  {
    name: 'Force Localhost Origin',
    description: 'Force localhost origin even on network access',
    convertUrl: (musicUrl: string) => {
      const videoId = musicUrl.match(/v=([^&]+)/)?.[1]
      return videoId
    },
    playerConfig: {
      autoplay: 1,
      controls: 0,
      enablejsapi: 1,
      playsinline: 1,
      origin: 'http://localhost:3000',
    }
  },
  {
    name: 'Direct Music URL',
    description: 'Try using music.youtube.com embed directly',
    convertUrl: (musicUrl: string) => {
      const videoId = musicUrl.match(/v=([^&]+)/)?.[1]
      return videoId ? `https://music.youtube.com/embed/${videoId}?autoplay=1&controls=0` : null
    },
    playerConfig: {
      autoplay: 1,
      controls: 0,
    }
  }
]

export default function TestYTMusicPage() {
  const [selectedConfig, setSelectedConfig] = useState(YTMUSIC_CONFIGS[0])
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([])
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null)
  const [isLoadingMusic, setIsLoadingMusic] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [playerKey, setPlayerKey] = useState(0)
  const [searchQuery, setSearchQuery] = useState('motivational music')
  const [currentOrigin, setCurrentOrigin] = useState('')

  const playerRef = useRef<YoutubePlayer | null>(null)

  // Get current origin on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin)
    }
  }, [])

  // Add log entry
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)])
  }

  // Search for YouTube Music tracks
  const searchMusic = async () => {
    addLog(`Searching YouTube Music for: ${searchQuery}`)
    setIsLoadingMusic(true)
    
    try {
      const response = await fetch(`/api/music-recommendations?query=${encodeURIComponent(searchQuery)}&limit=8`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      const tracks: MusicTrack[] = data.videos || []
      
      setMusicTracks(tracks)
      addLog(`Found ${tracks.length} YouTube Music tracks`)
      
      // Log first few URLs for debugging
      tracks.slice(0, 3).forEach((track, index) => {
        addLog(`Track ${index + 1}: ${track.url}`)
      })
      
    } catch (error) {
      addLog(`Music search failed: ${error}`)
      setMusicTracks([])
    } finally {
      setIsLoadingMusic(false)
    }
  }

  // Test playing a track with selected config
  const testTrack = (track: MusicTrack) => {
    addLog(`Testing track: ${track.name} by ${track.artist}`)
    addLog(`Original URL: ${track.url}`)
    
    const videoId = selectedConfig.convertUrl(track.url)
    addLog(`Extracted video ID: ${videoId}`)
    
    if (!videoId) {
      addLog('Failed to extract video ID')
      return
    }

    setSelectedTrack(track)
    setPlayerError(null)
    setIsPlayerReady(false)
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
          addLog('Paused playback')
        } else {
          playerRef.current.playVideo()
          addLog('Started playback')
        }
      } catch (e) {
        addLog(`Playback control failed: ${e}`)
      }
    }
  }

  // Get current video ID for player
  const getCurrentVideoId = () => {
    if (!selectedTrack) return null
    return selectedConfig.convertUrl(selectedTrack.url)
  }

  const currentVideoId = getCurrentVideoId()

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-center">YouTube Music Player Test</h1>
        <div className="text-center mb-8 bg-gray-900 p-4 rounded-lg">
          <div className="text-sm text-gray-400 mb-2">Current Access URL:</div>
          <div className="font-mono text-blue-400">{currentOrigin}</div>
          <div className="text-xs text-gray-500 mt-2">
            Testing YouTube Music playback from music.youtube.com URLs
          </div>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Search Panel */}
          <div className="space-y-6">
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Search YouTube Music</h2>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchMusic()}
                    placeholder="Search for music..."
                    className="flex-1 bg-gray-800 border border-gray-600 text-white rounded px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                  <Button 
                    onClick={searchMusic}
                    disabled={isLoadingMusic}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoadingMusic ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Music Tracks */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Music Tracks ({musicTracks.length})</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {musicTracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => testTrack(track)}
                    className={`w-full p-3 rounded text-left transition-all ${
                      selectedTrack?.id === track.id
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{track.name}</div>
                    <div className="text-xs opacity-70">{track.artist} • {track.duration}</div>
                  </button>
                ))}
                {musicTracks.length === 0 && !isLoadingMusic && (
                  <div className="text-gray-500 text-center py-8">
                    Search for music to see tracks
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Config Panel */}
          <div className="space-y-6">
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Player Configuration</h2>
              <div className="space-y-2">
                {YTMUSIC_CONFIGS.map((config, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedConfig(config)}
                    className={`w-full p-3 rounded text-left transition-all ${
                      selectedConfig.name === config.name
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{config.name}</div>
                    <div className="text-xs opacity-70">{config.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Player Status */}
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
                  <span>Error:</span>
                  <span className={playerError ? 'text-red-400' : 'text-green-400'}>
                    {playerError || 'None'}
                  </span>
                </div>
              </div>
              
              <Button 
                onClick={togglePlayback}
                disabled={!isPlayerReady || !selectedTrack}
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
              <h2 className="text-xl font-semibold mb-4">Test Logs</h2>
              <div className="bg-black p-4 rounded h-96 overflow-y-auto font-mono text-sm">
                {logs.length === 0 ? (
                  <div className="text-gray-500">No logs yet. Search and test music tracks.</div>
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
              <h2 className="text-xl font-semibold mb-4">Current Config</h2>
              <div className="text-sm">
                <div className="mb-2">
                  <span className="text-gray-400">Method:</span>
                  <div className="font-medium">{selectedConfig.name}</div>
                </div>
                <div className="mb-2">
                  <span className="text-gray-400">Description:</span>
                  <div className="text-gray-300">{selectedConfig.description}</div>
                </div>
                <div>
                  <span className="text-gray-400">Player Config:</span>
                  <pre className="bg-black p-2 rounded mt-1 text-xs overflow-x-auto">
                    {JSON.stringify(selectedConfig.playerConfig, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden YouTube Player */}
        {currentVideoId && (
          <div className="hidden">
            <YouTube
              key={`${currentVideoId}-${selectedConfig.name}-${playerKey}`}
              videoId={currentVideoId}
              opts={{
                width: '1',
                height: '1',
                playerVars: selectedConfig.playerConfig,
              }}
              onReady={(event: YouTubePlayerEvent) => {
                addLog('YouTube player ready')
                playerRef.current = event.target
                setIsPlayerReady(true)
              }}
              onPlay={() => {
                addLog('Playback started')
                setIsPlaying(true)
              }}
              onPause={() => {
                addLog('Playback paused')
                setIsPlaying(false)
              }}
              onEnd={() => {
                addLog('Playback ended')
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
            />
          </div>
        )}
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