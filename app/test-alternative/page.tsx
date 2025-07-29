"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, RefreshCw, Volume2 } from 'lucide-react'

// Alternative approaches to test
const ALTERNATIVE_APPROACHES = [
  {
    name: 'HTML5 Audio with Direct URL',
    type: 'audio',
    description: 'Try to extract direct audio URL and use HTML5 audio element'
  },
  {
    name: 'YouTube URL with ytdl-core',
    type: 'ytdl',
    description: 'Server-side extraction of audio stream URL'
  },
  {
    name: 'Proxy YouTube Request',
    type: 'proxy',
    description: 'Server-side proxy to YouTube with different headers'
  },
  {
    name: 'Alternative Music Sources',
    type: 'alternative',
    description: 'Use SoundCloud, Spotify preview, or other sources'
  }
]

// Test music sources that might work better
const TEST_SOURCES = [
  {
    id: 'test1',
    title: 'Test Audio File',
    type: 'direct',
    url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
  },
  {
    id: 'sc1',
    title: 'SoundCloud Embed Test',
    type: 'soundcloud',
    url: 'https://soundcloud.com/forss/flickermood'
  },
  {
    id: 'yt1',
    title: 'YouTube via Server Proxy',
    type: 'youtube-proxy',
    videoId: 'dQw4w9WgXcQ'
  }
]

export default function TestAlternativePage() {
  const [selectedApproach, setSelectedApproach] = useState(ALTERNATIVE_APPROACHES[0])
  const [selectedSource, setSelectedSource] = useState(TEST_SOURCES[0])
  const [logs, setLogs] = useState<string[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentOrigin, setCurrentOrigin] = useState('')
  const [testKey, setTestKey] = useState(0)

  const audioRef = useRef<HTMLAudioElement>(null)

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

  // Test different approaches
  const runTest = async () => {
    addLog(`Testing: ${selectedApproach.name} with ${selectedSource.title}`)
    setTestKey(prev => prev + 1)

    try {
      switch (selectedApproach.type) {
        case 'audio':
          await testDirectAudio()
          break
        case 'ytdl':
          await testYtdlApproach()
          break
        case 'proxy':
          await testProxyApproach()
          break
        case 'alternative':
          await testAlternativeSource()
          break
      }
    } catch (error) {
      addLog(`Error: ${error}`)
    }
  }

  const testDirectAudio = async () => {
    if (selectedSource.type === 'direct') {
      addLog('Testing direct audio URL...')
      if (audioRef.current) {
        audioRef.current.src = selectedSource.url
        audioRef.current.play()
        addLog('Direct audio playback started')
      }
    } else {
      addLog('Selected source is not a direct audio URL')
    }
  }

  const testYtdlApproach = async () => {
    addLog('Testing server-side YouTube extraction...')
    try {
      const response = await fetch('/api/extract-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          videoId: selectedSource.type === 'youtube-proxy' ? selectedSource.videoId : 'dQw4w9WgXcQ' 
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        addLog(`Server extraction successful: ${data.audioUrl}`)
        if (audioRef.current && data.audioUrl) {
          audioRef.current.src = data.audioUrl
          audioRef.current.play()
        }
      } else {
        addLog(`Server extraction failed: ${response.status}`)
      }
    } catch (error) {
      addLog(`YTDL test failed: ${error}`)
    }
  }

  const testProxyApproach = async () => {
    addLog('Testing proxy approach...')
    try {
      const response = await fetch('/api/proxy-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          videoId: selectedSource.type === 'youtube-proxy' ? selectedSource.videoId : 'dQw4w9WgXcQ',
          origin: currentOrigin
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        addLog(`Proxy successful: ${data.proxyUrl}`)
      } else {
        addLog(`Proxy failed: ${response.status}`)
      }
    } catch (error) {
      addLog(`Proxy test failed: ${error}`)
    }
  }

  const testAlternativeSource = async () => {
    addLog('Testing alternative music source...')
    if (selectedSource.type === 'soundcloud') {
      addLog('SoundCloud embed would be implemented here')
      // SoundCloud widget API could be used here
    } else {
      addLog('Alternative source test - implementation needed')
    }
  }

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
        addLog('Playback paused')
      } else {
        audioRef.current.play()
        setIsPlaying(true)
        addLog('Playback started')
      }
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-center">Alternative Music Player Test</h1>
        <div className="text-center mb-8 bg-gray-900 p-4 rounded-lg">
          <div className="text-sm text-gray-400 mb-2">Current Access URL:</div>
          <div className="font-mono text-blue-400">{currentOrigin}</div>
          <div className="text-xs text-gray-500 mt-2">
            Testing alternative approaches since YouTube embedding is blocked
          </div>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Controls Panel */}
          <div className="space-y-6">
            {/* Approach Selection */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Test Approach</h2>
              <div className="grid gap-2">
                {ALTERNATIVE_APPROACHES.map((approach, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedApproach(approach)}
                    className={`p-4 rounded text-left transition-all ${
                      selectedApproach.name === approach.name
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    <div className="font-medium mb-1">{approach.name}</div>
                    <div className="text-xs opacity-70">{approach.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Source Selection */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Test Source</h2>
              <div className="grid gap-2">
                {TEST_SOURCES.map((source) => (
                  <button
                    key={source.id}
                    onClick={() => setSelectedSource(source)}
                    className={`p-3 rounded text-left transition-all ${
                      selectedSource.id === source.id
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    <div className="font-medium">{source.title}</div>
                    <div className="text-sm opacity-70">{source.type}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Test Button */}
            <Button 
              onClick={runTest}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 text-lg"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Run Test
            </Button>

            {/* Audio Controls */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Audio Player</h2>
              <div className="space-y-4">
                <audio
                  ref={audioRef}
                  onPlay={() => {
                    setIsPlaying(true)
                    addLog('Audio started playing')
                  }}
                  onPause={() => {
                    setIsPlaying(false)
                    addLog('Audio paused')
                  }}
                  onError={(e) => {
                    addLog(`Audio error: ${e.currentTarget.error?.message}`)
                  }}
                  onLoadStart={() => addLog('Audio loading started')}
                  onCanPlay={() => addLog('Audio can play')}
                  className="w-full"
                  controls
                />
                
                <Button 
                  onClick={togglePlayback}
                  className="w-full bg-blue-600 hover:bg-blue-700"
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
          </div>

          {/* Info and Logs Panel */}
          <div className="space-y-6">
            {/* Current Test Info */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Current Test</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-400">Approach:</span>
                  <div className="font-medium">{selectedApproach.name}</div>
                  <div className="text-sm text-gray-400">{selectedApproach.description}</div>
                </div>
                <div>
                  <span className="text-gray-400">Source:</span>
                  <div className="font-medium">{selectedSource.title}</div>
                  <div className="text-sm text-gray-400">{selectedSource.type}</div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-amber-900/20 border border-amber-500/30 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 text-amber-200">💡 Recommendations</h2>
              <div className="space-y-3 text-sm text-amber-100">
                <div>
                  <strong>Server-side Solution:</strong> Create API endpoints that extract YouTube audio URLs server-side using libraries like ytdl-core.
                </div>
                <div>
                  <strong>Alternative Sources:</strong> Use SoundCloud, Spotify Web API, or royalty-free music libraries instead of YouTube.
                </div>
                <div>
                  <strong>Proxy Approach:</strong> Create a server proxy that fetches YouTube content with different headers/origins.
                </div>
                <div>
                  <strong>Local Development:</strong> Use localhost for development and deploy to a proper domain for production.
                </div>
              </div>
            </div>

            {/* Event Logs */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Test Logs</h2>
              <div className="bg-black p-4 rounded h-64 overflow-y-auto font-mono text-sm">
                {logs.length === 0 ? (
                  <div className="text-gray-500">No logs yet. Run a test to see results.</div>
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
          </div>
        </div>
      </div>
    </div>
  )
}