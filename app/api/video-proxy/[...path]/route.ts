import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import fs from 'fs'
import path from 'path'

// Helper to get content type from file extension
function getContentType(key: string): string {
  const extension = path.extname(key).toLowerCase()
  switch (extension) {
    case '.mp4': return 'video/mp4'
    case '.mov': return 'video/quicktime'
    case '.webm': return 'video/webm'
    case '.m4v': return 'video/x-m4v'
    case '.3gp': return 'video/3gpp'
    case '.flv': return 'video/x-flv'
    case '.avi': return 'video/x-msvideo'
    case '.mkv': return 'video/x-matroska'
    case '.webp': return 'image/webp'
    case '.png': return 'image/png'
    case '.jpg': return 'image/jpeg'
    case '.jpeg': return 'image/jpeg'
    default: return 'application/octet-stream'
  }
}

// Helper to convert Node.js Readable stream to a Web ReadableStream
function toWebStream(stream: Readable): ReadableStream {
  return new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => controller.enqueue(chunk));
      stream.on('end', () => controller.close());
      stream.on('error', (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET!

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ path: string[] }> }
) {
  const { path: urlPath } = await paramsPromise
  
  // The path now directly refers to the object in R2, whether it's a video or a thumbnail
  const objectKey = decodeURIComponent(urlPath.join('/'))

  // For thumbnail requests, the key will end with .webp
  const isThumbnailRequest = objectKey.endsWith('.webp')

  if (isThumbnailRequest) {
    console.log(`🖼️ Serving thumbnail: ${objectKey}`)
  } else {
    console.log(`🎥 Serving video: ${objectKey}`)
  }

  try {
    const headCommand = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
    })
    const metadata = await s3Client.send(headCommand)
    const totalSize = metadata.ContentLength
    const contentType = metadata.ContentType || getContentType(objectKey)

    if (!totalSize) {
      return new NextResponse('Could not determine object size', { status: 500 })
    }

    const range = request.headers.get('range')
    
    // Range requests are only for videos
    if (range && !isThumbnailRequest) {
      const parts = range.replace(/bytes=/, "").split("-")
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1
      const chunkSize = (end - start) + 1

      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: objectKey,
        Range: `bytes=${start}-${end}`,
      })
      const response = await s3Client.send(getCommand)

      if (!response.Body || !(response.Body instanceof Readable)) {
        return new NextResponse('Stream not available', { status: 500 })
      }
      
      const stream = toWebStream(response.Body)
      const headers = new Headers({
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Range, Content-Type, User-Agent',
        'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
        'X-Content-Type-Options': 'nosniff',
        'Vary': 'User-Agent, Range',
        'Connection': 'keep-alive',
      })

      return new NextResponse(stream, { status: 206, headers })

    } else {
      // Full request for thumbnails or initial video load
      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: objectKey,
      })
      const response = await s3Client.send(getCommand)
      
      if (!response.Body || !(response.Body instanceof Readable)) {
        return new NextResponse('Stream not available', { status: 500 })
      }

      const stream = toWebStream(response.Body)
      const headers = new Headers({
        'Content-Length': totalSize.toString(),
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=604800, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Range, Content-Type, User-Agent',
        'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
        'X-Content-Type-Options': 'nosniff',
        'Vary': 'User-Agent, Range',
        'Connection': 'keep-alive',
      })

      return new NextResponse(stream, { status: 200, headers })
    }

  } catch (e) {
    const error = e as { name?: string; message?: string };

    if (error.name === 'NotFound') {
      if (isThumbnailRequest) {
        console.log(`🟡 Thumbnail not found for ${objectKey}. Serving placeholder.`)
        try {
          const placeholderPath = path.join(process.cwd(), 'public', 'video-placeholder.png')
          const placeholderStream = fs.createReadStream(placeholderPath)
          const webStream = toWebStream(placeholderStream)
          
          return new NextResponse(webStream, {
            status: 200,
            headers: { 'Content-Type': 'image/png' },
          })
        } catch (placeholderError) {
          console.error(`❌ Failed to serve placeholder image:`, placeholderError)
          return new NextResponse('Placeholder not found', { status: 500 })
        }
      } else {
        // If a video is not found
      return new NextResponse('Video not found', { status: 404 })
      }
    }

    console.error(`❌ Proxy error for ${objectKey}:`, error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
} 