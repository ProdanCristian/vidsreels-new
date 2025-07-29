import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const videoId = searchParams.get('videoId')
  
  if (!videoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
  }

  try {
    // Create a proxied YouTube embed URL with different approach
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`
    
    // Fetch the embed page to check if it's available
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.youtube.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    })

    if (!response.ok) {
      return NextResponse.json({ 
        error: 'Video not available',
        status: response.status 
      }, { status: 404 })
    }

    const html = await response.text()
    
    // Check if video is available
    const isAvailable = !html.includes('Video unavailable') && 
                       !html.includes('Watch on YouTube') &&
                       !html.includes('This video is not available')
    
    return NextResponse.json({
      videoId,
      available: isAvailable,
      embedUrl: embedUrl,
      proxyUrl: `/api/youtube-proxy/embed?videoId=${videoId}`,
      message: isAvailable ? 'Video available' : 'Video may be restricted'
    })

  } catch (error) {
    console.error('YouTube proxy error:', error)
    return NextResponse.json({ 
      error: 'Failed to check video availability',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Embed proxy endpoint
export async function POST(request: NextRequest) {
  const { videoId } = await request.json()
  
  if (!videoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
  }

  // Return HTML that will be used in iframe
  const embedHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Music Player</title>
      <style>
        body { margin: 0; padding: 0; background: black; }
        iframe { width: 100%; height: 100vh; border: none; }
      </style>
    </head>
    <body>
      <iframe 
        src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=0&rel=0&modestbranding=1&playsinline=1"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen>
      </iframe>
      <script>
        // Post messages to parent window
        window.addEventListener('message', function(event) {
          if (event.data.type === 'play') {
            window.parent.postMessage({type: 'music-playing', videoId: '${videoId}'}, '*');
          }
        });
        
        // Auto-notify parent that player loaded
        setTimeout(() => {
          window.parent.postMessage({type: 'music-loaded', videoId: '${videoId}'}, '*');
        }, 1000);
      </script>
    </body>
    </html>
  `

  return new NextResponse(embedHtml, {
    headers: {
      'Content-Type': 'text/html',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  })
}