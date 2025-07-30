import { NextRequest, NextResponse } from 'next/server'

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

    // KIE.ai API Configuration
    const API_CONFIG = {
      endpoint: 'https://api.kie.ai/api/v1/generate',
      headers: {
        'Authorization': `Bearer ${kieApiKey}`,
        'Content-Type': 'application/json',
      },
      requestBody: {
        prompt: prompt,
        style: style,
        title: 'AI Generated Music',
        customMode: true,
        instrumental: instrumental,
        model: 'V3_5',
        callBackUrl: 'https://api.example.com/callback', // Required by KIE.ai
        negativeTags: ''
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
      console.log('🎵 KIE.ai API response received:', apiData)

      // Handle KIE.ai response format: {code: 200, msg: "success", data: {taskId: "..."}}
      if (apiData.code !== 200) {
        console.error('🎵 KIE.ai API returned error:', apiData.msg)
        return NextResponse.json({ 
          success: false, 
          error: 'Music generation failed',
          details: apiData.msg
        }, { status: 500 })
      }

      // KIE.ai returns a task ID for async processing
      if (apiData.data && apiData.data.taskId) {
        return NextResponse.json({
          success: true,
          tracks: [],
          task_id: apiData.data.taskId,
          status: 'processing',
          message: 'Music generation started. Check back in a few moments.'
        })
      }

      // Fallback: return the raw response for debugging
      console.log('🎵 Unexpected KIE.ai response format:', apiData)
      return NextResponse.json({ 
        success: false, 
        error: 'Unexpected response format from KIE.ai',
        debug: apiData
      }, { status: 500 })

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

    // Check generation status with KIE.ai API
    // Note: We might need to adjust this endpoint based on KIE.ai documentation
    const statusUrl = `https://api.kie.ai/api/v1/status/${taskId}`
    console.log('🎵 Checking KIE.ai status for task:', taskId)
    
    const kieApiResponse = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${kieApiKey}`,
        'Content-Type': 'application/json',
      }
    })

    if (!kieApiResponse.ok) {
      console.error('🎵 KIE.ai status check failed:', kieApiResponse.status)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to check generation status' 
      }, { status: 500 })
    }

    const statusData = await kieApiResponse.json()
    console.log('🎵 KIE.ai status response:', statusData)

    // Handle KIE.ai status response
    if (statusData.error) {
      return NextResponse.json({ 
        success: false, 
        error: statusData.error 
      }, { status: 500 })
    }

    // If generation is complete
    if (statusData.audio_url || statusData.audioUrl) {
      const track = {
        id: statusData.id || taskId,
        title: statusData.title || 'AI Generated Music',
        artist: 'KIE.ai Generated',
        thumbnail: statusData.image_url || '/music-placeholder.png',
        duration: formatDuration(statusData.duration || 120),
        url: statusData.audio_url || statusData.audioUrl,
        audioUrl: statusData.audio_url || statusData.audioUrl,
        style: statusData.style || 'generated',
        state: 'succeeded'
      }

      return NextResponse.json({
        success: true,
        tracks: [track],
        task_id: taskId
      })
    }

    // If still processing
    return NextResponse.json({
      success: true,
      tracks: [],
      task_id: taskId,
      status: statusData.status || 'processing',
      message: 'Music generation in progress...'
    })

  } catch (error) {
    console.error('🎵 Error checking KIE.ai status:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}