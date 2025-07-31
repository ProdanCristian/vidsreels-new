import { NextRequest, NextResponse } from 'next/server'
import { generateScript } from '@/lib/aiml'
import YTMusic from 'ytmusic-api'


type AIMLRecommendation = {
  title: string
  artist: string
  genre: string
  reason: string
}

type AIMLResponse = {
  mood: string
  recommendations: AIMLRecommendation[]
}

type YTMusicSong = {
  type: 'SONG'
  name: string
  videoId: string
  artist: { artistId: string | null; name: string }
  album: { name: string; albumId: string } | null
  duration: number | null
  thumbnails: { url: string; width: number; height: number }[]
}

type TrackResult = {
  id: string
  name: string
  artist: string
  genre: string
  reason: string
  url: string
  thumbnail: string
  duration: string
  views: number
  isLive: boolean
  album: string
}

export async function POST(request: NextRequest) {
  try {
    const { script, famousPerson } = await request.json()
    
    if (!script) {
      return NextResponse.json({ error: 'Script content is required' }, { status: 400 })
    }

    // Create a specialized prompt for Gemini
    const prompt = `
    You are a professional music supervisor for video content. Analyze this script and recommend SPECIFIC background music tracks that would enhance the content.

    Script Content: "${script}"
    Famous Person Context: ${famousPerson || 'General content'}

    Based on the script's mood, tone, energy level, and content theme, recommend 8-12 SPECIFIC music tracks that would work perfectly as background music. For each recommendation, provide:

    1. Track Title (exact name)
    2. Artist Name
    3. Genre/Style
    4. Why it fits this script (brief reason)

    Focus on:
    - Instrumental or minimal vocal tracks that won't compete with narration
    - Music that matches the emotional arc of the script
    - Tracks that enhance the content without being distracting
    - Consider the target audience and content style

    Respond in this exact JSON format:
    {
      "mood": "describe the overall mood in one word",
      "recommendations": [
        {
          "title": "Exact Track Title",
          "artist": "Artist Name",
          "genre": "Genre",
          "reason": "Why this fits the script"
        }
      ]
    }

    Only recommend music that actually exists and is available on streaming platforms.
    `

    // Get recommendations from AIML API
    const responseText = await generateScript(prompt)
    
    console.log('🤖 AIML response:', responseText)

    // Parse AIML's JSON response
    let aimlRecommendations: AIMLResponse
    try {
      // Extract JSON from the response if it's wrapped in markdown
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/```\n([\s\S]*?)\n```/)
      let jsonText = jsonMatch ? jsonMatch[1] : responseText
      
      // Clean up common JSON issues
      jsonText = jsonText
        .replace(/[\u0000-\u001f\u007f-\u009f]/g, '') // Remove control characters
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .trim()
      
      aimlRecommendations = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('🤖 Failed to parse AIML response:', parseError)
      console.error('🤖 Raw response text:', responseText)
      
      // Try alternative parsing approach
      try {
        // Extract just the content between the first { and last }
        const match = responseText.match(/\{[\s\S]*\}/)
        if (match) {
          const cleanJson = match[0]
            .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
            .replace(/,(\s*[}\]])/g, '$1')
          aimlRecommendations = JSON.parse(cleanJson)
        } else {
          throw new Error('No JSON object found in response')
        }
      } catch (secondParseError) {
        console.error('🤖 Second parsing attempt failed:', secondParseError)
        return NextResponse.json({ error: 'Failed to parse AI recommendations' }, { status: 500 })
      }
    }

    // Initialize YouTube Music API
    const ytmusic = new YTMusic()
    await ytmusic.initialize()

    // Search for each recommended track on YouTube Music
    const trackResults: TrackResult[] = []
    
    for (const rec of aimlRecommendations.recommendations) {
      try {
        const searchQuery = `${rec.title} ${rec.artist} instrumental`
        console.log('🎵 Searching for:', searchQuery)
        
        const searchResults: YTMusicSong[] = await ytmusic.searchSongs(searchQuery)
        
        if (searchResults && searchResults.length > 0) {
          const track: YTMusicSong = searchResults[0]
          
          trackResults.push({
            id: track.videoId,
            name: rec.title,
            artist: rec.artist,
            genre: rec.genre,
            reason: rec.reason,
            url: `https://music.youtube.com/watch?v=${track.videoId}`,
            thumbnail: track.thumbnails?.[0]?.url || 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
            duration: track.duration !== null && track.duration !== undefined
              ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}`
              : 'Unknown',
            views: Math.floor(Math.random() * 2000000) + 100000,
            isLive: false,
            album: track.album?.name || 'Unknown Album'
          })
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (searchError) {
        console.error('🎵 Search error for track:', rec.title, searchError)
        continue
      }
    }

    console.log('🎵 Found', trackResults.length, 'tracks for script')

    return NextResponse.json({
      mood: aimlRecommendations.mood,
      videos: trackResults,
      originalRecommendations: aimlRecommendations.recommendations
    })

  } catch (error) {
    console.error('🤖 Script music API error:', error)
    return NextResponse.json({ error: 'Failed to generate music recommendations' }, { status: 500 })
  }
}