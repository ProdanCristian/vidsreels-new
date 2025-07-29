"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, Search } from 'lucide-react'

interface MusicTrack {
  id: string;
  name: string;
  url: string;
  thumbnail: string;
  duration: string;
  artist: string;
}

export default function TestSimplePage() {
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([])
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null)
  const [isLoadingMusic, setIsLoadingMusic] = useState(false)
  const [searchQuery, setSearchQuery] = useState('motivational music')
  const [logs, setLogs] = useState<string[]>([])
  const [currentOrigin, setCurrentOrigin] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)

  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Add log entry
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 15)])
  }

  // Get current origin
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin)
      addLog(`Page loaded from: ${window.location.origin}`)
    }
  }, [])

  // Search for music
  const searchMusic = async () => {
    addLog(`Searching for: ${searchQuery}`)
    setIsLoadingMusic(true)
    
    try {
      const response = await fetch(`/api/music-recommendations?query=${encodeURIComponent(searchQuery)}&limit=6`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      const tracks: MusicTrack[] = data.videos || []
      
      setMusicTracks(tracks)
      addLog(`Found ${tracks.length} tracks`)
      
      // Test first few tracks
      for (let i = 0; i < Math.min(3, tracks.length); i++) {
        const track = tracks[i]
        const videoId = extractVideoId(track.url)
        addLog(`Track ${i + 1}: ${track.name} (ID: ${videoId})`)
      }
      
    } catch (error) {
      addLog(`Search failed: ${error}`)
      setMusicTracks([])
    } finally {
      setIsLoadingMusic(false)
    }
  }

  // Extract video ID
  const extractVideoId = (url: string): string | null => {
    const match = url.match(/v=([^&]+)/)
    return match ? match[1] : null
  }

  // Play track using different approaches
  const playTrack = async (track: MusicTrack) => {
    const videoId = extractVideoId(track.url)
    if (!videoId) {
      addLog('No video ID found')
      return
    }

    addLog(`Playing: ${track.name}`)
    setSelectedTrack(track)
    setIsPlaying(true)

    // Method 1: Try direct iframe approach
    if (iframeRef.current) {
      const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=0&rel=0&modestbranding=1&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`
      addLog(`Loading: ${embedUrl}`)
      iframeRef.current.src = embedUrl
    }
  }

  // Handle iframe messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'music-loaded') {
        addLog('Music player loaded successfully')
      } else if (event.data.type === 'music-playing') {
        addLog('Music started playing')
        setIsPlaying(true)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('message', handleMessage)
      return () => window.removeEventListener('message', handleMessage)
    }
  }, [])

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-center">Simple Music Test</h1>
        
        <div className="bg-gray-900 p-4 rounded-lg mb-6 text-center">
          <div className="text-sm text-gray-400">Current URL:</div>
          <div className="font-mono text-blue-400">{currentOrigin}</div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Search Panel */}
          <div className="space-y-6">
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Search Music</h2>
              <div className="flex gap-2 mb-4">
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
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Music Tracks */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Tracks ({musicTracks.length})</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {musicTracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => playTrack(track)}
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

            {/* Current Track */}
            {selectedTrack && (
              <div className="bg-gray-900 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Now Playing</h2>
                <div className="flex items-center gap-4">
                  <img 
                    src={selectedTrack.thumbnail} 
                    alt={selectedTrack.name}
                    className="w-16 h-16 rounded object-cover"
                  />
                  <div>
                    <div className="font-medium">{selectedTrack.name}</div>
                    <div className="text-sm text-gray-400">{selectedTrack.artist}</div>
                    <div className="text-xs text-gray-500">{selectedTrack.duration}</div>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <span className={`px-3 py-1 rounded text-xs ${
                    isPlaying ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                  }`}>
                    {isPlaying ? '▶️ Playing' : '⏸️ Stopped'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Logs Panel */}
          <div className="space-y-6">
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Event Logs</h2>
              <div className="bg-black p-4 rounded h-80 overflow-y-auto font-mono text-sm">
                {logs.length === 0 ? (
                  <div className="text-gray-500">No logs yet. Search for music to start.</div>
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

            {/* Test Different Approaches */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Test Methods</h2>
              <div className="space-y-2">
                <Button
                  onClick={() => addLog('Testing method 1: Direct iframe')}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-sm"
                >
                  Test Direct Iframe
                </Button>
                <Button
                  onClick={() => addLog('Testing method 2: Proxy approach')}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-sm"
                >
                  Test Proxy Method
                </Button>
                <Button
                  onClick={() => addLog('Testing method 3: Alternative source')}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-sm"
                >
                  Test Alternative Source
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden Music Player */}
        <div className="hidden">
          <iframe
            ref={iframeRef}
            width="1"
            height="1"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title="Music Player"
          />
        </div>
      </div>
    </div>
  )
}