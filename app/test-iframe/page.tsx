"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, RefreshCw } from 'lucide-react'

// Test video IDs
const TEST_VIDEOS = [
  { id: 'dQw4w9WgXcQ', title: 'Rick Astley - Never Gonna Give You Up' },
  { id: 'kJQP7kiw5Fk', title: 'Despacito' },
  { id: 'fJ9rUzIMcZQ', title: 'Bohemian Rhapsody' },
  { id: 'YQHsXMglC9A', title: 'Adele - Hello' },
  { id: 'CevxZvSJLk8', title: 'Katy Perry - Roar' },
  { id: '9bZkp7q19f0', title: 'PSY - GANGNAM STYLE' }
]

// Different iframe approaches
const IFRAME_CONFIGS = [
  {
    name: 'Direct YouTube Embed',
    getUrl: (videoId: string) => `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&rel=0&showinfo=0&modestbranding=1&iv_load_policy=3&fs=0&disablekb=1&enablejsapi=1&playsinline=1`
  },
  {
    name: 'YouTube NoCooke',
    getUrl: (videoId: string) => `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=0&rel=0&showinfo=0&modestbranding=1&iv_load_policy=3&fs=0&disablekb=1&enablejsapi=1&playsinline=1`
  },
  {
    name: 'Minimal Parameters',
    getUrl: (videoId: string) => `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&enablejsapi=1`
  },
  {
    name: 'No Autoplay (Manual Start)',
    getUrl: (videoId: string) => `https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&rel=0&showinfo=0&modestbranding=1`
  },
  {
    name: 'NoCooke + Minimal',
    getUrl: (videoId: string) => `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=0&enablejsapi=1&playsinline=1`
  },
  {
    name: 'Private Mode Simulation',
    getUrl: (videoId: string) => `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=0&rel=0&cc_load_policy=0&hl=en&modestbranding=1&playsinline=1`
  }
]

export default function TestIframePage() {
  const [selectedVideo, setSelectedVideo] = useState(TEST_VIDEOS[0])
  const [selectedConfig, setSelectedConfig] = useState(IFRAME_CONFIGS[0])
  const [logs, setLogs] = useState<string[]>([])
  const [iframeKey, setIframeKey] = useState(0)
  const [currentOrigin, setCurrentOrigin] = useState('')
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const iframeRef = useRef<HTMLIFrameElement>(null)

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

  // Load video with selected config
  const loadVideo = () => {
    addLog(`Loading: ${selectedVideo.title} with ${selectedConfig.name}`)
    setIsLoaded(false)
    setHasError(false)
    setIframeKey(prev => prev + 1)
  }

  // Handle iframe load
  const handleIframeLoad = () => {
    addLog('Iframe loaded successfully')
    setIsLoaded(true)
    setHasError(false)
  }

  // Handle iframe error
  const handleIframeError = () => {
    addLog('Iframe failed to load')
    setIsLoaded(false)
    setHasError(true)
  }

  const currentUrl = selectedConfig.getUrl(selectedVideo.id)

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-center">YouTube Iframe Test Lab</h1>
        <div className="text-center mb-8 bg-gray-900 p-4 rounded-lg">
          <div className="text-sm text-gray-400 mb-2">Current Access URL:</div>
          <div className="font-mono text-blue-400">{currentOrigin}</div>
          <div className="text-xs text-gray-500 mt-2">
            {currentOrigin.includes('localhost') ? '✅ Localhost access' : '⚠️ Network access - testing direct iframe approach'}
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
                    <div className="text-sm opacity-70">{video.id}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Config Selection */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Iframe Configuration</h2>
              <div className="grid gap-2">
                {IFRAME_CONFIGS.map((config, index) => (
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

            {/* Status */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Iframe Status</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Loaded:</span>
                  <span className={isLoaded ? 'text-green-400' : 'text-red-400'}>
                    {isLoaded ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Error:</span>
                  <span className={hasError ? 'text-red-400' : 'text-green-400'}>
                    {hasError ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Logs and Preview Panel */}
          <div className="space-y-6">
            {/* Current URL */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Generated URL</h2>
              <div className="bg-black p-4 rounded font-mono text-sm break-all text-green-400">
                {currentUrl}
              </div>
            </div>

            {/* Test Iframe */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Test Player</h2>
              <div className="bg-black p-4 rounded h-64 flex items-center justify-center">
                {selectedVideo && selectedConfig ? (
                  <iframe
                    key={iframeKey}
                    ref={iframeRef}
                    src={currentUrl}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    className="rounded"
                    title={`YouTube video player - ${selectedVideo.title}`}
                  />
                ) : (
                  <div className="text-gray-500">Select video and config to test</div>
                )}
              </div>
            </div>

            {/* Logs */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Event Logs</h2>
              <div className="bg-black p-4 rounded h-48 overflow-y-auto font-mono text-sm">
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
          </div>
        </div>
      </div>
    </div>
  )
}