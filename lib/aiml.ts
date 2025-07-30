import OpenAI from 'openai'

// Lazily create AIML client to avoid build-time environment variable access
let aimlClient: OpenAI | null = null

function getAIMLClient() {
  if (!aimlClient) {
    const apiKey = process.env.AIML_API_KEY
    if (!apiKey) {
      throw new Error('AIML_API_KEY is not set in the environment variables.')
    }

    aimlClient = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.aimlapi.com/v1',
    })
  }
  return aimlClient
}

// Helper function to generate scripts with streaming
export async function generateScriptStream(prompt: string) {
  try {
    console.log('=== AIML API CALL STARTING ===')
    console.log('Model: google/gemini-2.5-flash-lite-preview')
    console.log('Temperature: 0.9')
    console.log('Prompt hash:', prompt.substring(0, 50) + '...')
    console.log('Call timestamp:', new Date().toISOString())
    console.log('=== AIML API PARAMETERS ===')
    
    const aiml = getAIMLClient()
    const stream = await aiml.chat.completions.create({
      model: 'google/gemini-2.5-flash-lite-preview',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2048,
      temperature: 0.9, // High temperature for creativity and variation
      stream: true,
    })

    console.log('=== AIML API CALL SUCCESS ===')
    console.log('Stream created successfully')
    console.log('=== END AIML API CALL ===')

    return stream
  } catch (error) {
    console.error('=== AIML API ERROR ===')
    console.error('Error:', error)
    console.error('=== END AIML API ERROR ===')
    throw error
  }
}

// Helper function for non-streaming generation
export async function generateScript(prompt: string) {
  try {
    const aiml = getAIMLClient()
    const response = await aiml.chat.completions.create({
      model: 'google/gemini-2.5-flash-lite-preview',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2048,
      temperature: 0.9,
    })

    return response.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('AIML API Error:', error)
    throw error
  }
} 