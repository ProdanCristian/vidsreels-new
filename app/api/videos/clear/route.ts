import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    console.log('🗑️ Starting database cleanup...')
    
    // Delete all videos from database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (prisma as any).video.deleteMany({})
    
    console.log(`✅ Deleted ${result.count} videos from database`)

    return NextResponse.json({
      success: true,
      message: 'Database cleared successfully',
      deletedCount: result.count
    })

  } catch (error) {
    console.error('❌ Clear Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to clear database',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 