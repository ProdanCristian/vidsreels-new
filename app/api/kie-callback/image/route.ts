import { NextRequest, NextResponse } from 'next/server';
import { FluxCallbackData } from '@/lib/kie';

// In-memory storage for callback results (in production, use Redis or database)
declare global {
  var imageCallbackResults: Map<string, FluxCallbackData>;
}

if (!global.imageCallbackResults) {
  global.imageCallbackResults = new Map();
}

export async function POST(request: NextRequest) {
  try {
    const callbackData: FluxCallbackData = await request.json();
    
    console.log('📡 Received KIE image callback:', callbackData);

    // Validate callback data
    if (!callbackData.data || !callbackData.data.taskId) {
      return NextResponse.json(
        { error: 'Invalid callback data: missing taskId' },
        { status: 400 }
      );
    }

    // Store the result for polling
    const taskId = callbackData.data.taskId;
    global.imageCallbackResults.set(taskId, callbackData);
    
    console.log(`💾 Stored image result for task: ${taskId}`);

    // Log the result
    if (callbackData.code === 200) {
      console.log(`✅ Image generation completed for task: ${callbackData.data.taskId}`);
      if (callbackData.data.info?.resultImageUrl) {
        console.log(`🖼️ Result image URL: ${callbackData.data.info.resultImageUrl}`);
      }
    } else {
      console.log(`❌ Image generation failed for task: ${callbackData.data.taskId}, error: ${callbackData.msg}`);
    }

    // Return success response to KIE API
    return NextResponse.json({ status: 'received' }, { status: 200 });

  } catch (error) {
    console.error('❌ Error processing KIE image callback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for polling image results
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json(
      { error: 'Missing taskId parameter' },
      { status: 400 }
    );
  }

  const result = global.imageCallbackResults.get(taskId);
  
  if (result) {
    // Remove the result after returning it to avoid memory leaks
    global.imageCallbackResults.delete(taskId);
    return NextResponse.json(result);
  }

  return NextResponse.json({ status: 'pending' }, { status: 202 });
}