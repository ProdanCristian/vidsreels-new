import { NextRequest, NextResponse } from 'next/server';
import { createKieClient } from '@/lib/kie';

export async function POST(request: NextRequest) {
  try {
    const { scenes } = await request.json();

    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json(
        { error: 'Scenes array is required' },
        { status: 400 }
      );
    }

    console.log(`Generating images for ${scenes.length} scenes...`);

    const kie = createKieClient();
    const imageGenerationTasks = [];

    // Generate images for all scenes in parallel
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      
      // Enhanced prompt for better image generation
      const enhancedPrompt = `${scene.enhancedPrompt || scene.prompt}. Professional photography, cinematic lighting, high detail, sharp focus, realistic, photorealistic, 4K quality.`;
      
      console.log(`Generating image for scene ${i + 1}:`, enhancedPrompt.substring(0, 100) + '...');

      try {
        const taskPromise = kie.generateImage({
          prompt: enhancedPrompt,
          aspectRatio: '9:16', // Vertical format as requested
          model: 'flux-kontext-pro',
          promptUpsampling: true, // AI will enhance the prompt for better results
          outputFormat: 'jpeg',
          safetyTolerance: 2,
          // Callback URL will be auto-set by the KIE client
        });

        imageGenerationTasks.push({
          sceneId: scene.id,
          sceneIndex: i,
          promise: taskPromise,
          prompt: enhancedPrompt
        });

      } catch (error) {
        console.error(`Error starting image generation for scene ${i + 1}:`, error);
        imageGenerationTasks.push({
          sceneId: scene.id,
          sceneIndex: i,
          promise: Promise.resolve({
            code: 500,
            msg: `Failed to start generation: ${error instanceof Error ? error.message : 'Unknown error'}`,
            data: null
          }),
          prompt: enhancedPrompt,
          error: true
        });
      }
    }

    // Wait for all image generation tasks to complete (or get task IDs)
    const results = await Promise.allSettled(
      imageGenerationTasks.map(task => task.promise)
    );

    const imageResults = [];
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const task = imageGenerationTasks[i];
      
      if (result.status === 'fulfilled' && result.value.code === 200) {
        imageResults.push({
          sceneId: task.sceneId,
          sceneIndex: task.sceneIndex,
          taskId: result.value.data?.taskId,
          status: 'pending',
          prompt: task.prompt,
          success: true
        });
        console.log(`Image generation started for scene ${task.sceneId}, taskId: ${result.value.data?.taskId}`);
      } else {
        const error = result.status === 'rejected' ? result.reason : result.value.msg;
        imageResults.push({
          sceneId: task.sceneId,
          sceneIndex: task.sceneIndex,
          taskId: null,
          status: 'failed',
          error: error,
          prompt: task.prompt,
          success: false
        });
        console.error(`Image generation failed for scene ${task.sceneId}:`, error);
      }
    }

    const successCount = imageResults.filter(r => r.success).length;
    console.log(`Started ${successCount}/${scenes.length} image generation tasks successfully`);

    return NextResponse.json({
      success: true,
      data: {
        imageResults,
        totalScenes: scenes.length,
        successCount,
        failedCount: scenes.length - successCount,
        message: `Started ${successCount} image generation tasks. Results will be available via WebSocket callbacks.`
      }
    });

  } catch (error) {
    console.error('Error in scene image generation:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate scene images',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}