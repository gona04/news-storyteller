import { NextRequest, NextResponse } from 'next/server';
import { EdgeTTS } from 'edge-tts-universal';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (text.length > 20000) {
      return NextResponse.json(
        { error: 'Text too long (max 20000 characters)' },
        { status: 400 }
      );
    }

    // Initialize EdgeTTS with Guy voice
    const tts = new EdgeTTS('en-US-GuyNeural');
    tts.voice = 'en-US-GuyNeural';
    tts.text = text;

    // Generate audio
    const result = await tts.synthesize();
    const audioBlob = result.audio;

    // Convert blob to base64
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBase64 = Buffer.from(arrayBuffer).toString('base64');

    return NextResponse.json({
      success: true,
      audio: `data:audio/mp3;base64,${audioBase64}`,
      contentType: 'audio/mp3'
    });

  } catch (error) {
    console.error('TTS Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate speech',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'TTS API - POST with { text }',
    voice: 'en-US-GuyNeural',
    description: 'American male voice (Guy) for narration'
  });
}
