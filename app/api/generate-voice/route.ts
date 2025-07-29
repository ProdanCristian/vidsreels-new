import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text, reference_id, speed = 1.0, temperature = 0.9, top_p = 0.9 } = await request.json()

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    const FISHAUDIO_API_KEY = process.env.FISHAUDIO_API_KEY
    
    if (!FISHAUDIO_API_KEY) {
      return NextResponse.json(
        { error: 'Fish Audio API key not configured' },
        { status: 500 }
      )
    }

    // Prepare the request data for Fish Audio API v1
    const requestData = {
      text: text,
      temperature: temperature,
      top_p: top_p,
      reference_id: reference_id || null,
      chunk_length: 200,
      normalize: false, // Disabled for emotion control tags
      format: "mp3",
      mp3_bitrate: 128,
      latency: "normal",
      speed: speed // Voice speed control
    }

    // Try JSON first, fallback to MessagePack if needed
    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FISHAUDIO_API_KEY}`,
        'Content-Type': 'application/json',
        'model': 's1', // Use the latest recommended model
      },
      body: JSON.stringify(requestData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Fish Audio API error:', errorText)
      return NextResponse.json(
        { error: 'Failed to generate voice with Fish Audio' },
        { status: response.status }
      )
    }

    // Get the audio data
    const audioBuffer = await response.arrayBuffer()
    
    // Return the audio as a blob
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    })

  } catch (error) {
    console.error('Fish Audio voice generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 