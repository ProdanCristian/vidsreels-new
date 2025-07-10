"use client"

import { useState } from "react"
import DashboardHeader from "@/components/dashboard-header"
import DeleteTikTokView from "@/components/video-views/delete-tiktok-view"
import { Button } from "@/components/ui/button"
import { Shuffle, AlertTriangle, RotateCcw } from "lucide-react"

export default function DeleteVideosPage() {
  const [isShuffled, setIsShuffled] = useState(false)
  const [resetKey, setResetKey] = useState(0) // Force component re-render
  const collectionId = "luxury" // Default collection ID

  // Toggle shuffle and reset to page 1
  const toggleShuffle = () => {
    setIsShuffled(!isShuffled)
  }

  // Clear saved position and deleted videos list
  const clearSavedPosition = () => {
    try {
      localStorage.removeItem(`delete-videos-position-${collectionId}`)
      localStorage.removeItem(`deleted-videos-${collectionId}`)
      console.log('🔄 Reset position and deleted videos list')
      // Force component re-render to reset state
      setResetKey(prev => prev + 1)
    } catch (error) {
      console.warn('Failed to clear saved position:', error)
    }
  }

  return (
    <div className="h-screen bg-black text-white">
      <DashboardHeader />
      
      {/* Control Bar */}
      <div className="fixed top-16 sm:top-20 left-0 right-0 bg-black bg-opacity-95 backdrop-blur-sm border-b border-gray-800 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h1 className="text-lg font-semibold text-red-400">Delete Videos</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={clearSavedPosition}
              className="bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-600"
              title="Start from beginning"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Position
            </Button>
            
            <Button
              variant={isShuffled ? "default" : "outline"}
              size="sm"
              onClick={toggleShuffle}
              className={`${
                isShuffled 
                  ? "bg-blue-600 hover:bg-blue-700 text-white" 
                  : "bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-600"
              }`}
            >
              <Shuffle className="h-4 w-4 mr-2" />
              {isShuffled ? "Shuffled" : "Shuffle"}
            </Button>
          </div>
        </div>
        
        {/* Warning Banner */}
        <div className="bg-red-900 bg-opacity-50 border-t border-red-800 px-4 py-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <p className="text-sm text-red-200">
              Warning: Deleted videos cannot be recovered. This will permanently remove files from storage and database.
            </p>
          </div>
        </div>
        
        <div className="bg-blue-900 bg-opacity-30 border-t border-blue-800 px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-blue-400"></div>
            <p className="text-sm text-blue-200">
              Your position is automatically saved and will be restored when you refresh the page.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 sm:pt-24">
        <DeleteTikTokView
          key={resetKey} // Force re-render when reset
          collectionId={collectionId}
          isShuffled={isShuffled}
        />
      </div>
    </div>
  )
} 