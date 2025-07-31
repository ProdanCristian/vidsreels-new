import { NextRequest, NextResponse } from 'next/server';
import { VideoCallbackData } from '@/lib/kie';

// In-memory storage for callback results (in production, use Redis or database)
declare global {
  var videoCallbackResults: Map<string, VideoCallbackData>;
}

if (!global.videoCallbackResults) {
  global.videoCallbackResults = new Map();
}

export async function POST(request: NextRequest) {
  try {
    const callbackData: VideoCallbackData = await request.json();
    
    console.log('📡 Received KIE video callback:', callbackData);

    // Validate callback data
    if (!callbackData.data || !callbackData.data.task_id) {
      return NextResponse.json(
        { error: 'Invalid callback data: missing task_id' },
        { status: 400 }
      );
    }

    // Store the result for polling
    const taskId = callbackData.data.task_id;
    global.videoCallbackResults.set(taskId, callbackData);
    
    console.log(`💾 Stored video result for task: ${taskId}`);

    // Log the result
    if (callbackData.code === 200) {
      console.log(`✅ Video generation completed for task: ${callbackData.data.task_id}`);
      if (callbackData.data.video_url) {
        console.log(`🎬 Video URL: ${callbackData.data.video_url}`);
      }
      if (callbackData.data.image_url) {
        console.log(`🖼️ Cover image URL: ${callbackData.data.image_url}`);
      }
    } else {
      console.log(`❌ Video generation failed for task: ${callbackData.data.task_id}, error: ${callbackData.msg}`);
    }

    // Return success response to KIE API
    return NextResponse.json({ status: 'received' }, { status: 200 });

  } catch (error) {
    console.error('❌ Error processing KIE video callback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for polling video results
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json(
      { error: 'Missing taskId parameter' },
      { status: 400 }
    );
  }

  const result = global.videoCallbackResults.get(taskId);
  
  if (result) {
    // Remove the result after returning it to avoid memory leaks
    global.videoCallbackResults.delete(taskId);
    return NextResponse.json(result);
  }

  return NextResponse.json({ status: 'pending' }, { status: 202 });
}