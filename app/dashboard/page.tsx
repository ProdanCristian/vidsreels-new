"use client"

import { useRouter } from "next/navigation"
import DashboardHeader from "@/components/dashboard-header"
import { Play, Crown } from "lucide-react"

export default function Dashboard() {
  const router = useRouter()

  const handleViewCollection = (collectionName: string) => {
    router.push(`/collection/${collectionName}`)
  }

  const luxury=()=>{
    router.push("/luxury")
  }



  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <DashboardHeader />

      {/* Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 sm:pt-24">
        
        {/* Main Heading Section */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Select Video Category
          </h1>
          <p className="text-sm text-white/70 mb-1 max-w-2xl mx-auto">
            Choose from different categories to create AI-powered faceless videos with voiceovers
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Luxury Collection Card */}
          <div 
            className="relative cursor-pointer group"
            onClick={() => luxury()}
            style={{ aspectRatio: '3 / 4' }}
          >
            {/* Main Card */}
            <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20 hover:ring-white/40 transition-all duration-300">
              
              {/* Video Background */}
              <video 
                autoPlay 
                loop 
                muted 
                playsInline
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              >
                <source src="/Luxury_1833_mp4.mp4" type="video/mp4" />
              </video>
              
              {/* Simple gradient overlay - only for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-black/50 transition-all duration-500"></div>
              
              {/* Subtle glass effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20 group-hover:from-white/5 transition-all duration-500"></div>
              
              {/* Content */}
              <div className="relative z-10 flex flex-col items-center justify-center text-center p-6 h-full">
                {/* Icon */}
                <div className="mb-4 transform group-hover:scale-110 transition-transform duration-300">
                  <Crown className="w-12 h-12 text-white drop-shadow-2xl" />
                </div>
                
                {/* Text content with single backdrop blur */}
                <div className="px-6 py-4 rounded-xl backdrop-blur-md bg-black/20 border border-white/10">
                  {/* Title */}
                  <h2 className="text-xl font-bold text-white mb-2 tracking-wider drop-shadow-lg">
                    LUXURY
                  </h2>
                  
                  {/* Subtitle */}
                  <p className="text-xs text-white/95 font-medium mb-4 leading-relaxed">
                    Generate luxury videos with voiceovers
                  </p>
                  
                  {/* CTA Button with card hover effects */}
                  <button
                    className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full font-medium text-white text-sm border border-white/30 hover:bg-white/30 hover:border-white/50 group-hover:bg-white/35 group-hover:border-white/60 group-hover:scale-105 transform transition-all duration-200 shadow-lg"
                    onClick={e => {
                      e.stopPropagation()
                      handleViewCollection("luxury")
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Play className="w-3 h-3" fill="currentColor" />
                      <span>Start Creating</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>



          {/* Placeholder Card 3 */}
          <div 
            className="relative cursor-pointer group opacity-50"
            style={{ aspectRatio: '3 / 4' }}
          >
            <div className="relative w-full h-full rounded-2xl backdrop-blur-2xl shadow-2xl overflow-hidden border-2 border-dashed border-gray-600">
              <div className="absolute inset-0 bg-gray-900/50"></div>
              <div className="relative z-10 flex flex-col items-center justify-center text-center p-4 h-full">
                <div className="text-gray-500 text-sm">Coming Soon</div>
              </div>
            </div>
          </div>

          {/* Placeholder Card 4 */}
          <div 
            className="relative cursor-pointer group opacity-50"
            style={{ aspectRatio: '3 / 4' }}
          >
            <div className="relative w-full h-full rounded-2xl backdrop-blur-2xl shadow-2xl overflow-hidden border-2 border-dashed border-gray-600">
              <div className="absolute inset-0 bg-gray-900/50"></div>
              <div className="relative z-10 flex flex-col items-center justify-center text-center p-4 h-full">
                <div className="text-gray-500 text-sm">Coming Soon</div>
              </div>
            </div>
          </div>

        </div>

        {/* Smaller Collection Cards */}
        <div className="mt-12">
          <h3 className="text-xl font-semibold text-white mb-2 text-center">Quick Access Collections</h3>
          <p className="text-sm text-white/60 mb-6 text-center">Access downloadable videos from different collections</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            
            {/* Luxury Collection */}
            <div 
              className="relative cursor-pointer group"
              onClick={() => handleViewCollection("luxury")}
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-black/30 backdrop-blur-md border border-white/20 hover:border-white/40 transition-all duration-300 shadow-lg">
                <div className="flex flex-col items-center justify-center h-full p-4">
                  <Crown className="w-8 h-8 text-white/80 mb-2 group-hover:scale-110 group-hover:text-white transition-all duration-200" />
                  <span className="text-xs font-medium text-white/90 text-center">Luxury</span>
                </div>
              </div>
            </div>

            {/* Tech Collection */}
            <div 
              className="relative cursor-pointer group"
              onClick={() => handleViewCollection("tech")}
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-black/30 backdrop-blur-md border border-white/20 hover:border-white/40 transition-all duration-300 shadow-lg">
                <div className="flex flex-col items-center justify-center h-full p-4">
                  <div className="w-8 h-8 text-white/80 mb-2 group-hover:scale-110 group-hover:text-white transition-all duration-200">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 7H7v10h2V7zm4 0h-2v10h2V7zm4 0h-2v10h2V7z"/>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-white/90 text-center">Tech</span>
                </div>
              </div>
            </div>

            {/* Fashion Collection */}
            <div 
              className="relative cursor-pointer group"
              onClick={() => handleViewCollection("fashion")}
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-black/30 backdrop-blur-md border border-white/20 hover:border-white/40 transition-all duration-300 shadow-lg">
                <div className="flex flex-col items-center justify-center h-full p-4">
                  <div className="w-8 h-8 text-white/80 mb-2 group-hover:scale-110 group-hover:text-white transition-all duration-200">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-white/90 text-center">Fashion</span>
                </div>
              </div>
            </div>

            {/* Travel Collection */}
            <div 
              className="relative cursor-pointer group"
              onClick={() => handleViewCollection("travel")}
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-black/30 backdrop-blur-md border border-white/20 hover:border-white/40 transition-all duration-300 shadow-lg">
                <div className="flex flex-col items-center justify-center h-full p-4">
                  <div className="w-8 h-8 text-white/80 mb-2 group-hover:scale-110 group-hover:text-white transition-all duration-200">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-white/90 text-center">Travel</span>
                </div>
              </div>
            </div>

            {/* Food Collection */}
            <div 
              className="relative cursor-pointer group"
              onClick={() => handleViewCollection("food")}
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-black/30 backdrop-blur-md border border-white/20 hover:border-white/40 transition-all duration-300 shadow-lg">
                <div className="flex flex-col items-center justify-center h-full p-4">
                  <div className="w-8 h-8 text-white/80 mb-2 group-hover:scale-110 group-hover:text-white transition-all duration-200">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 6v8h3v8H5v-8h3V6c0-3.31 2.69-6 6-6s6 2.69 6 6z"/>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-white/90 text-center">Food</span>
                </div>
              </div>
            </div>

            {/* Fitness Collection */}
            <div 
              className="relative cursor-pointer group"
              onClick={() => handleViewCollection("fitness")}
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-black/30 backdrop-blur-md border border-white/20 hover:border-white/40 transition-all duration-300 shadow-lg">
                <div className="flex flex-col items-center justify-center h-full p-4">
                  <div className="w-8 h-8 text-white/80 mb-2 group-hover:scale-110 group-hover:text-white transition-all duration-200">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L4.86 7.71 13.43 16.29 9.86 19.86 11.29 21.29 12.71 19.86 14.14 21.29 16.29 19.14 17.71 20.57 19.14 19.14 17.71 17.71 20.57 14.86z"/>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-white/90 text-center">Fitness</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}