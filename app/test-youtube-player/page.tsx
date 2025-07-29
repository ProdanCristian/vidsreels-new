"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, RefreshCw, Search } from 'lucide-react'
import YouTube from 'react-youtube'
import YouTubePlayer from 'youtube-player'

interface MusicTrack {
  id: string;
  name: string;
  url: string;
  thumbnail: string;
  duration: string;
  artist: string;
}

interface YouTubeEvent {
  target: {
    playVideo: () => void;
    pauseVideo: () => void;
  };
}

// Player comparison configurations
const PLAYER_CONFIGS = [
  {
    name: 'React YouTube (Current)',
    type: 'react-youtube',
    config: {
      autoplay: 1,
      enablejsapi: 1,
    }
  },
  {
    name: 'YouTube Player (New)',
    type: 'youtube-player',
    config: {
      autoplay: 1,
      controls: 0,
      enablejsapi: 1,
      playsinline: 1,
    }
  },
  {
    name: 'YouTube Player Minimal',
    type: 'youtube-player',
    config: {
      autoplay: 1,
      enablejsapi: 1,
    }
  },
  {
    name: 'YouTube Player Enhanced',
    type: 'youtube-player',
    config: {
      autoplay: 1,
      controls: 0,
      enablejsapi: 1,
      playsinline: 1,
      rel: 0,
      modestbranding: 1,
    }
  }
]

export default function TestYouTubePlayerPage() {
  const [selectedConfig, setSelectedConfig] = useState(PLAYER_CONFIGS[1]) // Start with new player
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
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Player refs
  const reactYouTubeRef = useRef<YouTubeEvent['target'] | null>(null)
  const youtubePlayerRef = useRef<any>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)

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
      const response = await fetch(`/api/music-recommendations?query=${encodeURIComponent(searchQuery)}&limit=6`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      const tracks: MusicTrack[] = data.videos || []
      
      setMusicTracks(tracks)
      addLog(`Found ${tracks.length} YouTube Music tracks`)
      
    } catch (error) {
      addLog(`Music search failed: ${error}`)
      setMusicTracks([])
    } finally {
      setIsLoadingMusic(false)
    }
  }

  // Extract video ID from YouTube Music URL
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:music\.youtube\.com\/watch\?v=)([^&\n?#]+)/,
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }
    return null
  }

  // Test playing a track with selected player
  const testTrack = async (track: MusicTrack) => {
    addLog(`Testing track: ${track.name} by ${track.artist}`)
    addLog(`Using player: ${selectedConfig.name}`)
    
    const videoId = extractVideoId(track.url)
    if (!videoId) {
      addLog('Failed to extract video ID')
      return
    }

    // Reset states
    setSelectedTrack(track)
    setPlayerError(null)
    setIsPlayerReady(false)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setPlayerKey(prev => prev + 1)

    // Clean up existing players
    if (youtubePlayerRef.current) {
      try {
        youtubePlayerRef.current.destroy()
      } catch (e) {
        console.log('Error destroying youtube-player:', e)
      }
      youtubePlayerRef.current = null
    }

    if (selectedConfig.type === 'youtube-player') {
      await setupYouTubePlayer(videoId)
    }
    // react-youtube will be handled by the component re-render
  }

  // Setup youtube-player package
  const setupYouTubePlayer = async (videoId: string) => {
    if (!playerContainerRef.current) {
      addLog('No container ref available')
      return
    }

    try {
      addLog('Creating youtube-player instance...')
      
      // Clear container
      playerContainerRef.current.innerHTML = ''
      
      // Create player
      const player = YouTubePlayer(playerContainerRef.current, {
        width: 1,
        height: 1,
        videoId: videoId,
        playerVars: selectedConfig.config
      })

      youtubePlayerRef.current = player

      // Setup event listeners
      player.on('ready', () => {
        addLog('youtube-player ready')
        setIsPlayerReady(true)
        
        // Get duration
        player.getDuration().then((dur: number) => {
          setDuration(dur)
          addLog(`Duration: ${dur}s`)
        }).catch((e: Error) => addLog(`Duration error: ${e}`))
      })

      player.on('stateChange', async () => {
        const state = await player.getPlayerState()
        addLog(`State change: ${state}`)
        
        if (state === 1) { // Playing
          setIsPlaying(true)
          addLog('Started playing')
        } else if (state === 2) { // Paused
          setIsPlaying(false)
          addLog('Paused')
        } else if (state === 0) { // Ended
          setIsPlaying(false)
          addLog('Ended')
        }
      })

      player.on('error', (error: Error) => {
        addLog(`youtube-player error: ${error}`)
        setPlayerError(`Error: ${error}`)
        setIsPlaying(false)
        setIsPlayerReady(false)
      })

      // Start time tracking
      const timeInterval = setInterval(async () => {
        if (youtubePlayerRef.current && isPlaying) {
          try {
            const current = await youtubePlayerRef.current.getCurrentTime()
            setCurrentTime(current)
          } catch (e) {
            // Ignore time tracking errors
          }
        }
      }, 1000)

      // Store interval for cleanup
      ;(player as any).timeInterval = timeInterval

    } catch (error) {
      addLog(`youtube-player setup failed: ${error}`)
      setPlayerError(`Setup failed: ${error}`)
    }
  }

  // Manual play/pause
  const togglePlayback = async () => {
    if (selectedConfig.type === 'youtube-player' && youtubePlayerRef.current) {
      try {
        const state = await youtubePlayerRef.current.getPlayerState()
        if (state === 1) { // Playing
          await youtubePlayerRef.current.pauseVideo()
          addLog('Paused via youtube-player')
        } else {
          await youtubePlayerRef.current.playVideo()
          addLog('Playing via youtube-player')
        }
      } catch (e) {
        addLog(`youtube-player control failed: ${e}`)
      }
    } else if (selectedConfig.type === 'react-youtube' && reactYouTubeRef.current) {
      try {
        if (isPlaying) {
          reactYouTubeRef.current.pauseVideo()
          addLog('Paused via react-youtube')
        } else {
          reactYouTubeRef.current.playVideo()
          addLog('Playing via react-youtube')
        }
      } catch (e) {
        addLog(`react-youtube control failed: ${e}`)
      }
    }
  }

  // Format time
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (youtubePlayerRef.current) {
        try {
          if ((youtubePlayerRef.current as any).timeInterval) {
            clearInterval((youtubePlayerRef.current as any).timeInterval)
          }
          youtubePlayerRef.current.destroy()
        } catch (e) {
          console.log('Cleanup error:', e)
        }
      }
    }
  }, [])

  const currentVideoId = selectedTrack ? extractVideoId(selectedTrack.url) : null

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-center">YouTube Player Package Comparison</h1>
        <div className="text-center mb-8 bg-gray-900 p-4 rounded-lg">
          <div className="text-sm text-gray-400 mb-2">Current Access URL:</div>
          <div className="font-mono text-blue-400">{currentOrigin}</div>
          <div className="text-xs text-gray-500 mt-2">
            Comparing react-youtube vs youtube-player packages
          </div>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Search Panel */}
          <div className="space-y-6">
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Search Music</h2>
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
              <div className="space-y-2 max-h-64 overflow-y-auto">
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
                    <div className="text-xs opacity-70">{track.artist}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Config Panel */}
          <div className="space-y-6">
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Player Type</h2>
              <div className="space-y-2">
                {PLAYER_CONFIGS.map((config, index) => (
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
                    <div className="text-xs opacity-70">{config.type}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Player Status */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Player Status</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Type:</span>
                  <span className="text-blue-400">{selectedConfig.type}</span>
                </div>
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
              <h2 className="text-xl font-semibold mb-4">Event Logs</h2>
              <div className="bg-black p-4 rounded h-80 overflow-y-auto font-mono text-sm">
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
              <h2 className="text-xl font-semibold mb-4">Config</h2>
              <pre className="bg-black p-2 rounded text-xs overflow-x-auto">
                {JSON.stringify(selectedConfig.config, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Hidden Players */}
        <div className="hidden">
          {/* youtube-player container */}
          <div ref={playerContainerRef} id="youtube-player-container"></div>
          
          {/* react-youtube player */}
          {selectedConfig.type === 'react-youtube' && currentVideoId && (
            <YouTube
              key={`${currentVideoId}-${playerKey}`}
              videoId={currentVideoId}
              opts={{
                width: '1',
                height: '1',
                playerVars: selectedConfig.config,
              }}
              onReady={(event: YouTubeEvent) => {
                addLog('react-youtube ready')
                reactYouTubeRef.current = event.target
                setIsPlayerReady(true)
              }}
              onPlay={() => {
                addLog('react-youtube playing')
                setIsPlaying(true)
              }}
              onPause={() => {
                addLog('react-youtube paused')
                setIsPlaying(false)
              }}
              onEnd={() => {
                addLog('react-youtube ended')
                setIsPlaying(false)
              }}
              onError={(error: { data: number }) => {
                addLog(`react-youtube error: ${error.data}`)
                setPlayerError(`Error: ${error.data}`)
                setIsPlaying(false)
                setIsPlayerReady(false)
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}