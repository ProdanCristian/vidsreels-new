import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'

// GET - Fetch user's saved scripts
export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const scripts = await prisma.script.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        content: true,
        topic: true,
        duration: true,
        isGenerated: true,
        createdAt: true
      }
    })

    return NextResponse.json({ scripts })

  } catch (error) {
    console.error('Error fetching scripts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Save a new script
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { title, content, topic, duration, isGenerated } = await request.json()

    if (!title || !content || !topic || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Character limit check (900 chars for 1 minute)
    const maxChars = duration * 15 // 15 chars per second (900 for 60 seconds)
    if (content.length > maxChars) {
      return NextResponse.json(
        { error: `Script too long. Maximum ${maxChars} characters for ${duration} seconds.` },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const script = await prisma.script.create({
      data: {
        title,
        content,
        topic,
        duration: parseInt(duration),
        isGenerated: Boolean(isGenerated),
        userId: user.id
      }
    })

    return NextResponse.json({ 
      message: 'Script saved successfully',
      script 
    })

  } catch (error) {
    console.error('Error saving script:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 