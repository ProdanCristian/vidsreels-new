"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, RefreshCw } from 'lucide-react'
import YouTube from 'react-youtube'

// Simple test to compare HTTP vs HTTPS
const TEST_VIDEO_ID = 'dQw4w9WgXcQ' // Rick Roll - should work if embedding is allowed

export default function TestHttpsPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [isSecure, setIsSecure] = useState(false)
  const [currentUrl, setCurrentUrl] = useState('')
  const [playerReady, setPlayerReady] = useState(false)
  const [playerError, setPlayerError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSecure(window.location.protocol === 'https:')
      setCurrentUrl(window.location.href)
      addLog(`Page loaded via ${window.location.protocol}`)
      addLog(`Full URL: ${window.location.href}`)
    }
  }, [])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 15)])
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-center">HTTP vs HTTPS YouTube Embedding Test</h1>
        
        {/* Connection Info */}
        <div className="bg-gray-900 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Connection Information</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Protocol:</span>
              <span className={isSecure ? 'text-green-400' : 'text-red-400'}>
                {isSecure ? '🔒 HTTPS (Secure)' : '🔓 HTTP (Insecure)'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Current URL:</span>
              <span className="font-mono text-sm text-blue-400 break-all">{currentUrl}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>YouTube Embedding:</span>
              <span className={isSecure ? 'text-green-400' : 'text-yellow-400'}>
                {isSecure ? 'Should work ✅' : 'Likely blocked ⚠️'}
              </span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-900/20 border border-blue-500/30 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4 text-blue-200">💡 How to Test HTTPS</h2>
          <div className="space-y-3 text-sm text-blue-100">
            <div>
              <strong>Current HTTP Access:</strong>
              <div className="font-mono text-blue-300">http://192.168.1.75:3000/test-https</div>
            </div>
            <div>
              <strong>HTTPS Access (Run this in terminal):</strong>
              <div className="bg-black p-2 rounded mt-1 font-mono text-green-400">
                npm run https
              </div>
              <div className="text-xs mt-1">Then visit: <span className="font-mono text-blue-300">https://192.168.1.75:3001/test-https</span></div>
            </div>
            <div className="text-xs text-blue-200">
              ⚠️ You'll need to accept the self-signed certificate warning in your browser
            </div>
          </div>
        </div>

        {/* Player Test */}
        <div className="bg-gray-900 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">YouTube Player Test</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Player Status:</span>
              <span className={playerReady ? 'text-green-400' : 'text-gray-400'}>
                {playerReady ? 'Ready ✅' : 'Not Ready'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Player Error:</span>
              <span className={playerError ? 'text-red-400' : 'text-green-400'}>
                {playerError || 'None ✅'}
              </span>
            </div>
            
            {!isSecure && (
              <div className="p-3 bg-red-900/20 border border-red-500/30 rounded">
                <div className="text-red-200 text-sm">
                  ⚠️ You're accessing via HTTP. YouTube embedding will likely fail due to security policies.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Event Logs */}
        <div className="bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Event Logs</h2>
          <div className="bg-black p-4 rounded h-64 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500">Loading...</div>
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

        {/* Hidden YouTube Player */}
        <div className="hidden">
          <YouTube
            videoId={TEST_VIDEO_ID}
            opts={{
              width: '1',
              height: '1',
              playerVars: {
                autoplay: 1,
                enablejsapi: 1,
              },
            }}
            onReady={() => {
              addLog('YouTube player ready - embedding works!')
              setPlayerReady(true)
              setPlayerError(null)
            }}
            onPlay={() => {
              addLog('YouTube player started playing')
            }}
            onError={(error: any) => {
              const errorCode = error.data
              addLog(`YouTube player error: ${errorCode}`)
              setPlayerError(`Error ${errorCode}`)
              setPlayerReady(false)
              
              if (errorCode === 150 || errorCode === 101) {
                addLog('Embedding restricted - likely due to HTTP protocol')
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}