"use client"

import { useRouter } from "next/navigation"
import DashboardHeader from "@/components/dashboard-header"
import { Play, Crown } from "lucide-react"

export default function Dashboard() {
  const router = useRouter()

  const handleViewCollection = (collectionName: string) => {
    router.push(`/collection/${collectionName}`)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <DashboardHeader />

      {/* Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 sm:pt-24 flex items-center justify-center">
        {/* Welcome Section */}
        {/* <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {session?.user?.name || session?.user?.email || "User"}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Ready to manage your video collections?
          </p>
        </div> */}

        {/* Luxury Collection - Featured */}
        <div className="w-full max-w-sm">
          <div 
            className="relative cursor-pointer group"
            onClick={() => handleViewCollection("luxury")}
            style={{ aspectRatio: '9 / 16' }}
          >
            {/* Main Card */}
            <div className="relative w-full h-full rounded-2xl backdrop-blur-2xl shadow-2xl overflow-hidden">
              
              {/* Video Background */}
              <video 
                autoPlay 
                loop 
                muted 
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              >
                <source src="/Luxury_1833_mp4.mp4" type="video/mp4" />
              </video>
              
              {/* Dark overlay to ensure content visibility */}
              <div className="absolute inset-0 bg-black/40"></div>
              
              {/* Visible border effects */}
              <div className="absolute inset-0 rounded-2xl border border-white/40 blur-sm"></div>
              <div className="absolute inset-0 rounded-2xl border border-white/25"></div>
              <div className="absolute inset-0 rounded-2xl border border-slate-300/20"></div>
              
              {/* Darker glass overlay with hover effect */}
              <div className="absolute inset-0 backdrop-blur-sm group-hover:backdrop-blur-none transition-all duration-300" style={{
                background: `linear-gradient(135deg, 
                  rgba(255, 255, 255, 0.12) 0%, 
                  rgba(255, 255, 255, 0.06) 30%, 
                  rgba(255, 255, 255, 0.04) 50%, 
                  rgba(255, 255, 255, 0.05) 70%, 
                  rgba(0, 0, 0, 0.25) 100%)`
              }}></div>
              
              {/* Content */}
              <div className="relative z-10 flex flex-col items-center justify-center text-center p-8 h-full">
                {/* Icon */}
                <div className="mb-8">
                  <Crown className="w-20 h-20 text-slate-300 drop-shadow-[0_0_15px_rgba(148,163,184,0.3)]" />
                </div>
                
                {/* Title */}
                <h2 className="text-5xl sm:text-6xl font-bold text-white mb-4 tracking-wide">
                  <span className="bg-gradient-to-r from-slate-200 via-white to-slate-300 bg-clip-text text-transparent">
                    LUXURY
                  </span>
                </h2>
                
                {/* Subtitle */}
                <p className="text-lg text-slate-400 mb-8 max-w-xs font-light">
                  Discover premium content curated for excellence
                </p>
                
                {/* Glass CTA Button */}
                <button
                  className="cursor-pointer relative px-8 py-4 bg-black/20 backdrop-blur-md rounded-full font-semibold text-white shadow-lg overflow-hidden"
                  onClick={e => {
                    e.stopPropagation()
                    handleViewCollection("luxury")
                  }}
                >
                  {/* Visible button borders */}
                  <div className="absolute inset-0 rounded-full border border-white/40 blur-sm"></div>
                  <div className="absolute inset-0 rounded-full border border-white/25"></div>
                  <div className="absolute inset-0 rounded-full border border-slate-300/15"></div>
                  <div className="relative flex items-center gap-2">
                    <Play className="w-5 h-5" fill="currentColor" />
                    <span>Enter Collection</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}