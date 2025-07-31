import { NextRequest, NextResponse } from 'next/server';
import { generateScript } from '@/lib/aiml';

export async function POST(request: NextRequest) {
  try {
    const { script, voiceDuration } = await request.json();

    if (!script || !script.trim()) {
      return NextResponse.json(
        { error: 'Script is required' },
        { status: 400 }
      );
    }

    // Create prompt for generating scene descriptions
    const scenePrompt = `You are an expert video director and scene designer. Based on the provided script and voice duration, create consistent visual scenes for a 9:16 vertical video.

SCRIPT:
${script}

VOICE DURATION: ${voiceDuration ? `${voiceDuration} seconds` : 'Unknown duration'}

REQUIREMENTS FOR SCENE GENERATION:
1. Generate 3-5 scenes that flow seamlessly together
2. Each scene should be 5 seconds long for video generation
3. Focus on actions and movements rather than static descriptions
4. Include temporal elements (e.g., "gradually", "suddenly", "slowly")
5. Describe camera movements when relevant (e.g., "zoom in", "pan left", "close-up")
6. Be consistent with subject and style throughout all scenes
7. Optimize for 9:16 vertical format (portrait orientation)
8. Make scenes visually engaging and cinematic

PROMPT ENGINEERING GUIDELINES:
- Use cinematic language and visual storytelling
- Include lighting descriptions (dramatic lighting, golden hour, soft lighting)
- Specify composition (close-up, wide shot, medium shot)
- Add atmosphere and mood descriptors
- Include professional video terminology
- Focus on visual consistency across all scenes

STYLE GUIDELINES:
- Professional and cinematic quality
- High production value appearance
- Consistent color palette and lighting
- Smooth transitions between scenes
- Visual coherence throughout the video

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "scenes": [
    {
      "id": 1,
      "duration": 5,
      "prompt": "Detailed scene description optimized for AI image generation",
      "description": "Brief human-readable description of the scene",
      "cameraMovement": "Description of camera movement/angle",
      "timing": "0-5 seconds"
    }
  ],
  "totalDuration": 25,
  "style": "Overall visual style description",
  "consistency": "Key elements that maintain visual consistency"
}

Generate scenes that will create a compelling visual narrative for this script. Each scene prompt should be detailed enough for AI image generation while maintaining visual consistency throughout the video.`;

    console.log('Generating scenes with Gemini 2.5...');
    
    const response = await generateScript(scenePrompt);
    
    if (!response) {
      throw new Error('No response from AI');
    }

    // Try to parse JSON response
    let sceneData;
    try {
      // Clean up the response to extract JSON
      const cleanResponse = response.trim();
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        sceneData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing scene response:', parseError);
      
      // Fallback: Create scenes from the raw response
      const lines = response.split('\n').filter(line => line.trim());
      const scenes = [];
      
      for (let i = 0; i < Math.min(4, Math.max(3, Math.floor(lines.length / 2))); i++) {
        scenes.push({
          id: i + 1,
          duration: 5,
          prompt: `Professional cinematic scene ${i + 1}: ${lines[i] || `Scene depicting the essence of the script with dramatic lighting and 9:16 composition`}`,
          description: `Scene ${i + 1}`,
          cameraMovement: i === 0 ? "Wide establishing shot" : i === scenes.length - 1 ? "Close-up finale" : "Medium tracking shot",
          timing: `${i * 5}-${(i + 1) * 5} seconds`
        });
      }
      
      sceneData = {
        scenes,
        totalDuration: scenes.length * 5,
        style: "Professional cinematic style with consistent lighting and composition",
        consistency: "Consistent visual elements and color palette throughout all scenes"
      };
    }

    // Validate and enhance scene data
    if (!sceneData.scenes || !Array.isArray(sceneData.scenes)) {
      throw new Error('Invalid scene data structure');
    }

    // Enhance each scene prompt for better AI generation
    sceneData.scenes = sceneData.scenes.map((scene: { prompt?: string; description?: string; cameraMovement?: string; timing?: string }, index: number) => ({
      ...scene,
      id: index + 1,
      duration: 5, // Fixed 5-second duration
      prompt: `${scene.prompt || scene.description || `Professional scene ${index + 1}`}. Shot in 9:16 vertical format, cinematic quality, professional lighting, high resolution, detailed composition.`,
      enhancedPrompt: `Professional cinematic scene: ${scene.prompt || scene.description}. Vertical 9:16 aspect ratio, dramatic lighting, high production value, detailed background, sharp focus, cinematic composition, professional video quality.`
    }));

    console.log(`Generated ${sceneData.scenes.length} scenes successfully`);

    return NextResponse.json({
      success: true,
      data: sceneData
    });

  } catch (error) {
    console.error('Error generating scenes:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate scenes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}