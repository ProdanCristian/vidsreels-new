import { NextRequest, NextResponse } from 'next/server'

interface SunoTrack {
  id: string
  title: string
  audio_url: string
  image_url: string
  duration: number
  lyric: string
  style: string
  state: string
}

interface SunoResponse {
  success: boolean
  data: SunoTrack[]
  task_id?: string
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, style = "instrumental, cinematic, epic", instrumental = true } = await request.json()
    
    console.log('🎵 Suno API called with prompt:', prompt)
    console.log('🎵 Style:', style)
    console.log('🎵 Instrumental:', instrumental)

    const kieApiKey = process.env.KIE_API_KEY
    if (!kieApiKey) {
      console.error('🎵 KIE_API_KEY not found in environment variables')
      return NextResponse.json({ 
        success: false, 
        error: 'KIE API key not configured' 
      }, { status: 500 })
    }

    // Generate music using Suno API
    const sunoResponse = await fetch('https://api.acedata.cloud/suno/audios', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kieApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'generate',
        prompt: prompt,
        style: style,
        instrumental: instrumental,
        model: 'chirp-v4'
      }),
    })

    if (!sunoResponse.ok) {
      console.error('🎵 Suno API error:', sunoResponse.status, sunoResponse.statusText)
      const errorText = await sunoResponse.text()
      console.error('🎵 Suno API error details:', errorText)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to generate music' 
      }, { status: 500 })
    }

    const sunoData: SunoResponse = await sunoResponse.json()
    console.log('🎵 Suno API response:', sunoData)

    if (!sunoData.success || !sunoData.data) {
      console.error('🎵 Suno API returned unsuccessful response')
      return NextResponse.json({ 
        success: false, 
        error: 'Music generation failed' 
      }, { status: 500 })
    }

    // Transform Suno response to match our interface
    const tracks = sunoData.data.map((track: SunoTrack) => ({
      id: track.id,
      title: track.title || 'AI Generated Music',
      artist: 'AI Generated',
      thumbnail: track.image_url || '/music-placeholder.png',
      duration: formatDuration(track.duration),
      url: track.audio_url,
      audioUrl: track.audio_url, // Direct audio URL instead of YouTube
      style: track.style,
      lyric: track.lyric,
      state: track.state
    }))

    // Filter for completed tracks only
    const completedTracks = tracks.filter(track => track.state === 'succeeded')

    console.log('🎵 Returning Suno generated tracks:', completedTracks.length)
    
    return NextResponse.json({ 
      success: true,
      tracks: completedTracks,
      task_id: sunoData.task_id
    })

  } catch (error) {
    console.error('🎵 Suno music generation error:', error)
    
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Helper function to convert seconds to MM:SS format
function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || isNaN(seconds)) return 'Unknown'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// GET endpoint to check generation status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('task_id')

  if (!taskId) {
    return NextResponse.json({ 
      success: false, 
      error: 'Task ID required' 
    }, { status: 400 })
  }

  try {
    const kieApiKey = process.env.KIE_API_KEY
    if (!kieApiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'KIE API key not configured' 
      }, { status: 500 })
    }

    // Check generation status
    const sunoResponse = await fetch(`https://api.acedata.cloud/suno/audios?task_id=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${kieApiKey}`,
        'Content-Type': 'application/json',
      }
    })

    if (!sunoResponse.ok) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to check generation status' 
      }, { status: 500 })
    }

    const sunoData: SunoResponse = await sunoResponse.json()
    
    if (!sunoData.success || !sunoData.data) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to get generation status' 
      }, { status: 500 })
    }

    // Transform response
    const tracks = sunoData.data.map((track: SunoTrack) => ({
      id: track.id,
      title: track.title || 'AI Generated Music',
      artist: 'AI Generated',
      thumbnail: track.image_url || '/music-placeholder.png',
      duration: formatDuration(track.duration),
      url: track.audio_url,
      audioUrl: track.audio_url,
      style: track.style,
      lyric: track.lyric,
      state: track.state
    }))

    return NextResponse.json({ 
      success: true,
      tracks: tracks,
      task_id: taskId
    })

  } catch (error) {
    console.error('🎵 Error checking generation status:', error)
    
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}