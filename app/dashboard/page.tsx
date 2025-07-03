"use client"

import { useRouter } from "next/navigation"
import DashboardHeader from "@/components/dashboard-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
          <Card
            className="overflow-hidden rounded-3xl shadow-2xl group cursor-pointer border-2 border-white/10 hover:border-white/20 transition-all duration-300"
            onClick={() => handleViewCollection("luxury")}
            style={{ aspectRatio: '9 / 16' }}
          >
            <div className="relative w-full h-full">
              <video
                className="w-full h-full object-cover"
                src="/api/videos/luxury?page=1&limit=1&shuffle=true&timestamp=1"
                autoPlay
                loop
                muted
                playsInline
                poster="/video-placeholder.png" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <div className="mb-4">
                  <Crown className="w-16 h-16 text-white/80 drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]" />
                </div>
                <h2 className="text-4xl sm:text-5xl font-extrabold text-white uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]">
                  Luxury
                </h2>
                <p className="text-md sm:text-lg text-white/70 mt-2 font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
                  Enter the world of premium content
                </p>
                <Button
                  size="lg"
                  className="mt-8 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white font-bold py-3 px-8 rounded-full text-lg shadow-xl transition-all duration-300 transform group-hover:scale-105"
                  onClick={e => {
                    e.stopPropagation()
                    handleViewCollection("luxury")
                  }}
                >
                  <Play className="w-5 h-5 mr-2" fill="currentColor" />
                  Explore Now
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}