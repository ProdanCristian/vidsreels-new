import { NextRequest, NextResponse } from 'next/server';
import { getWebSocketServer } from '@/lib/websocket-server';

// Global variable to track if server is running
let wsServerStarted = false;

export async function GET(request: NextRequest) {
  try {
    if (!wsServerStarted) {
      console.log('🚀 Starting WebSocket server...');
      const wsServer = getWebSocketServer();
      await wsServer.start();
      wsServerStarted = true;
      console.log('✅ WebSocket server started successfully');
    }

    return NextResponse.json({
      success: true,
      message: 'WebSocket server is running',
      port: 3001
    });

  } catch (error) {
    console.error('❌ Failed to start WebSocket server:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to start WebSocket server',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Also handle POST for consistency
export async function POST(request: NextRequest) {
  return GET(request);
}