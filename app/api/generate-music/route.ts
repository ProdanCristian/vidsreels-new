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
    
    // Debug environment variables
    console.log('🔑 Environment variables check:')
    console.log('🔑 KIE_API_KEY exists:', !!kieApiKey)
    console.log('🔑 KIE_API_KEY length:', kieApiKey ? kieApiKey.length : 0)
    console.log('🔑 KIE_API_KEY preview:', kieApiKey ? `${kieApiKey.substring(0, 8)}...${kieApiKey.substring(kieApiKey.length - 4)}` : 'null')
    console.log('🔑 All KIE env vars:', Object.keys(process.env).filter(key => key.includes('KIE')))
    
    if (!kieApiKey) {
      console.error('🎵 KIE_API_KEY not found in environment variables')
      return NextResponse.json({ 
        success: false, 
        error: 'KIE API key not configured' 
      }, { status: 500 })
    }

    // TODO: Configure these values for the actual KIE.ai API
    const API_CONFIG = {
      // PLACEHOLDER: Update with actual KIE.ai API endpoint
      endpoint: 'https://api.acedata.cloud/suno/audios', // This is WRONG - needs actual KIE.ai endpoint
      headers: {
        'Authorization': `Bearer ${kieApiKey}`,
        'Content-Type': 'application/json',
      },
      // PLACEHOLDER: Update request body format for KIE.ai
      requestBody: {
        action: 'generate',
        prompt: prompt,
        style: style,
        instrumental: instrumental,
        model: 'chirp-v4'
      }
    }

    console.log('🎵 Making API call to:', API_CONFIG.endpoint)
    console.log('🎵 Request body:', JSON.stringify(API_CONFIG.requestBody, null, 2))
    
    try {
      const apiResponse = await fetch(API_CONFIG.endpoint, {
        method: 'POST',
        headers: API_CONFIG.headers,
        body: JSON.stringify(API_CONFIG.requestBody),
      })

      if (!apiResponse.ok) {
        console.error('🎵 API error:', apiResponse.status, apiResponse.statusText)
        const errorText = await apiResponse.text()
        console.error('🎵 API error details:', errorText)
        return NextResponse.json({ 
          success: false, 
          error: `API call failed: ${apiResponse.status} ${apiResponse.statusText}`,
          details: errorText
        }, { status: 500 })
      }

      const apiData = await apiResponse.json()
      console.log('🎵 API response received:', apiData)

      // TODO: Update response parsing for KIE.ai API format
      if (!apiData.success || !apiData.data) {
        console.error('🎵 API returned unsuccessful response')
        return NextResponse.json({ 
          success: false, 
          error: 'Music generation failed',
          apiResponse: apiData
        }, { status: 500 })
      }

      // TODO: Update track transformation for KIE.ai response format
      const tracks = apiData.data.map((track: any) => ({
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

      const completedTracks = tracks.filter((track: any) => track.state === 'succeeded')

      console.log('🎵 Returning generated tracks:', completedTracks.length)

      return NextResponse.json({
        success: true,
        tracks: completedTracks,
        task_id: apiData.task_id
      })

    } catch (error) {
      console.error('🎵 Network/API error:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Network error or API unavailable',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

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
    
    // Debug environment variables for GET endpoint
    console.log('🔑 GET endpoint - KIE_API_KEY exists:', !!kieApiKey)
    console.log('🔑 GET endpoint - KIE_API_KEY length:', kieApiKey ? kieApiKey.length : 0)
    
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