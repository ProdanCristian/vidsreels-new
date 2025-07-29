import { generateScript } from '@/lib/aiml'

export async function POST(req: Request) {
  const { prompt } = await req.json()

  console.log('=== API ROUTE RECEIVED REQUEST ===')
  console.log('Prompt length:', prompt.length)
  console.log('Prompt preview (first 200 chars):', prompt.substring(0, 200))
  console.log('Request timestamp:', new Date().toISOString())
  console.log('=== END API REQUEST ===')

  try {
    // Add JSON formatting instruction to the prompt
    const jsonPrompt = `${prompt}

CRITICAL: Return your response as a JSON object with this exact structure:
{
  "scripts": [
    "VERSION 1 content here",
    "VERSION 2 content here", 
    "VERSION 3 content here"
  ]
}

Make sure each script is a complete, standalone story without any VERSION labels or format markers. Return ONLY the JSON object, no other text.`

    const response = await generateScript(jsonPrompt)
    
    console.log('=== API RESPONSE RECEIVED ===')
    console.log('Response length:', response.length)
    console.log('Response preview:', response.substring(0, 200))
    console.log('=== END API RESPONSE ===')

    // Try to parse JSON response
    try {
      // Strip markdown code blocks if present
      let cleanResponse = response.trim()
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      const jsonResponse = JSON.parse(cleanResponse)
      if (jsonResponse.scripts && Array.isArray(jsonResponse.scripts)) {
        return Response.json(jsonResponse)
      } else {
        throw new Error('Invalid JSON structure')
      }
    } catch (parseError) {
      console.error('JSON parsing failed, trying fallback parsing...', parseError)
      
      // Fallback: split by VERSION markers if JSON parsing fails
      const scripts = response.split(/VERSION \d+:/i)
        .filter(script => script.trim().length > 50)
        .map(script => script.trim())
        .slice(1) // Remove empty first element
      
      return Response.json({ scripts })
    }
    
  } catch (error) {
    console.error('Error generating script with AIML:', error)
    return Response.json({ error: 'Failed to generate script' }, { status: 500 })
  }
} 