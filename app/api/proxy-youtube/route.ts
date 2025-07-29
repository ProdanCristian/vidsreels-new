import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { videoId, origin } = await request.json()
    
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
    }

    // Try different proxy approaches
    const embedUrls = [
      `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=0&enablejsapi=1&playsinline=1&origin=https://localhost:3000`,
      `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&enablejsapi=1&playsinline=1`,
      `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=0&rel=0&cc_load_policy=0&hl=en&modestbranding=1&playsinline=1`,
    ]

    const results = []

    for (const url of embedUrls) {
      try {
        console.log(`Testing URL: ${url}`)
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://localhost:3000/',
            'Origin': 'https://localhost:3000',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'iframe',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'cross-site',
          }
        })

        results.push({
          url,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          success: response.ok,
          contentType: response.headers.get('content-type'),
          hasVideoUnavailable: false,
          htmlSnippet: ''
        })

        if (response.ok) {
          const html = await response.text()
          const hasVideoUnavailable = html.includes('Video unavailable') || html.includes('Watch on YouTube')
          
          results[results.length - 1].hasVideoUnavailable = hasVideoUnavailable
          results[results.length - 1].htmlSnippet = html.substring(0, 300) + '...'
          
          if (!hasVideoUnavailable) {
            // This URL works!
            return NextResponse.json({
              success: true,
              workingUrl: url,
              videoId,
              message: 'Found working proxy URL',
              testResults: results
            })
          }
        }

      } catch (fetchError) {
        results.push({
          url,
          error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
          success: false,
          hasVideoUnavailable: true,
          htmlSnippet: ''
        })
      }
    }

    return NextResponse.json({
      success: false,
      message: 'No working proxy URLs found',
      videoId,
      origin,
      testResults: results
    })

  } catch (error) {
    console.error('Proxy test error:', error)
    return NextResponse.json({ 
      error: 'Server error during proxy test',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}