import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    console.log(`Checking status for task: ${taskId}`);

    // Call KIE API to check task status
    const response = await fetch(`https://api.kie.ai/api/v1/flux/kontext/record-info?taskId=${taskId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.KIE_API_KEY}`,
      }
    });

    if (!response.ok) {
      throw new Error(`KIE API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Task ${taskId} status:`, data);

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error checking task status:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to check task status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}