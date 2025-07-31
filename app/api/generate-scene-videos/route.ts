import { NextRequest, NextResponse } from 'next/server';
import { createKieClient } from '@/lib/kie';

export async function POST(request: NextRequest) {
  try {
    const { scenes, imageResults } = await request.json();

    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json(
        { error: 'Scenes array is required' },
        { status: 400 }
      );
    }

    if (!imageResults || !Array.isArray(imageResults) || imageResults.length === 0) {
      return NextResponse.json(
        { error: 'Image results array is required' },
        { status: 400 }
      );
    }

    console.log(`Generating videos for ${imageResults.length} scenes...`);

    const kie = createKieClient();
    const videoGenerationTasks = [];

    // Generate videos from images
    for (let i = 0; i < imageResults.length; i++) {
      const imageResult = imageResults[i];
      const scene = scenes.find((s: any) => s.id === imageResult.sceneId);
      
      if (!imageResult.imageUrl || !scene) {
        console.log(`Skipping video generation for scene ${imageResult.sceneId} - missing image URL or scene data`);
        continue;
      }

      // Create video generation prompt with movement and action
      const videoPrompt = `${scene.prompt}. ${scene.cameraMovement || 'Smooth camera movement'}. Cinematic motion, gradual transitions, professional video quality, smooth animation, realistic movement.`;
      
      console.log(`Generating video for scene ${imageResult.sceneId}:`, videoPrompt.substring(0, 100) + '...');

      try {
        const taskPromise = kie.generateVideo({
          prompt: videoPrompt,
          imageUrl: imageResult.imageUrl, // Use the generated image as reference
          duration: 5, // 5 seconds as specified
          quality: '1080p', // High quality as requested
          aspectRatio: '9:16', // Vertical format
          waterMark: '', // No watermark
          // Callback URL will be auto-set by the KIE client
        });

        videoGenerationTasks.push({
          sceneId: scene.id,
          sceneIndex: i,
          imageTaskId: imageResult.taskId,
          imageUrl: imageResult.imageUrl,
          promise: taskPromise,
          prompt: videoPrompt
        });

      } catch (error) {
        console.error(`Error starting video generation for scene ${scene.id}:`, error);
        videoGenerationTasks.push({
          sceneId: scene.id,
          sceneIndex: i,
          imageTaskId: imageResult.taskId,
          imageUrl: imageResult.imageUrl,
          promise: Promise.resolve({
            code: 500,
            msg: `Failed to start generation: ${error instanceof Error ? error.message : 'Unknown error'}`,
            data: null
          }),
          prompt: videoPrompt,
          error: true
        });
      }
    }

    // Wait for all video generation tasks to complete (or get task IDs)
    const results = await Promise.allSettled(
      videoGenerationTasks.map(task => task.promise)
    );

    const videoResults = [];
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const task = videoGenerationTasks[i];
      
      if (result.status === 'fulfilled' && result.value.code === 200) {
        videoResults.push({
          sceneId: task.sceneId,
          sceneIndex: task.sceneIndex,
          imageTaskId: task.imageTaskId,
          imageUrl: task.imageUrl,
          videoTaskId: result.value.data?.taskId,
          status: 'pending',
          prompt: task.prompt,
          success: true
        });
        console.log(`Video generation started for scene ${task.sceneId}, taskId: ${result.value.data?.taskId}`);
      } else {
        const error = result.status === 'rejected' ? result.reason : result.value.msg;
        videoResults.push({
          sceneId: task.sceneId,
          sceneIndex: task.sceneIndex,
          imageTaskId: task.imageTaskId,
          imageUrl: task.imageUrl,
          videoTaskId: null,
          status: 'failed',
          error: error,
          prompt: task.prompt,
          success: false
        });
        console.error(`Video generation failed for scene ${task.sceneId}:`, error);
      }
    }

    const successCount = videoResults.filter(r => r.success).length;
    console.log(`Started ${successCount}/${videoGenerationTasks.length} video generation tasks successfully`);

    return NextResponse.json({
      success: true,
      data: {
        videoResults,
        totalScenes: videoGenerationTasks.length,
        successCount,
        failedCount: videoGenerationTasks.length - successCount,
        message: `Started ${successCount} video generation tasks. Results will be available via WebSocket callbacks.`
      }
    });

  } catch (error) {
    console.error('Error in scene video generation:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate scene videos',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}