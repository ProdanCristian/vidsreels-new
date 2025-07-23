import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  throw new Error('GEMINI_API_KEY is not set in the environment variables.')
}

const genAI = new GoogleGenerativeAI(apiKey)

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
})

export async function POST(req: Request) {
  const { prompt } = await req.json()

  try {
    const result = await model.generateContentStream(prompt)
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const chunkText = chunk.text()
          controller.enqueue(new TextEncoder().encode(chunkText))
        }
        controller.close()
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (error) {
    console.error('Error generating script with Gemini:', error)
    return new Response('Failed to generate script', { status: 500 })
  }
} 