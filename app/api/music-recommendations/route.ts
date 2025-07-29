import { NextRequest, NextResponse } from 'next/server'
import YTMusic from 'ytmusic-api'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query') || 'motivational music'
  const limit = parseInt(searchParams.get('limit') || '12')

  console.log('🎵 Music API called with query:', query)
  console.log('🎵 Limit:', limit)

  try {
    const ytmusic = new YTMusic()
    await ytmusic.initialize()
    
    // Search for music based on the query
    const searchResults = await ytmusic.searchSongs(query, { limit })
    
    
    // Helper function to convert seconds to MM:SS format
    const formatDuration = (seconds: number | null | undefined): string => {
      if (!seconds || isNaN(seconds)) return 'Unknown'
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }

    const recommendedTracks = searchResults.map((song: Record<string, unknown>) => {
      return {
        id: (song.videoId as string) || (song.id as string),
        name: (song.name as string) || (song.title as string),
        url: `https://music.youtube.com/watch?v=${(song.videoId as string) || (song.id as string)}`,
        thumbnail: ((song.thumbnails as Array<{url: string}>)?.[0]?.url) || 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        duration: formatDuration(song.duration as number),
        views: Math.floor(Math.random() * 2000000) + 100000,
        isLive: false,
        artist: ((song.artist as {name: string})?.name) || 'Unknown Artist',
        album: ((song.album as {name: string})?.name) || 'Unknown Album'
      }
    })
    
    console.log('🎵 Returning YouTube Music tracks:', recommendedTracks.length)
    
    return NextResponse.json({ videos: recommendedTracks })

  } catch (error) {
    console.error('🎵 YouTube Music API error:', error)
    
    // Return empty array if API fails
    return NextResponse.json({ videos: [] })
  }
}