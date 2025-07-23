import { model } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";

// Helper function to convert a File object to a GoogleGenerativeAI.Part object
async function fileToGenerativePart(file: File) {
  const buffer = await file.arrayBuffer();
  return {
    inlineData: {
      data: Buffer.from(buffer).toString("base64"),
      mimeType: file.type,
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const prompt = formData.get("prompt") as string | null;
    const videoFile = formData.get("video") as File | null;

    if (!prompt && !videoFile) {
      return NextResponse.json(
        { error: "Prompt or video file is required." },
        { status: 400 }
      );
    }

    const parts = [];
    // The Gemini API works best when the prompt text comes after the media
    if (videoFile) {
      // Per the Gemini documentation, the model works best with video and text in this order.
      const videoPart = await fileToGenerativePart(videoFile);
      parts.push(videoPart);
    }
    if (prompt) {
      parts.push({ text: prompt });
    }

    const result = await model.generateContent(parts);
    const response = result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (e: any) {
    console.error("Error in Gemini API route:", e);
    return NextResponse.json(
      { error: `Error processing request: ${e.message}` },
      { status: 500 }
    );
  }
} 