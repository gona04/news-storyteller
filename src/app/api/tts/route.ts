import { NextRequest, NextResponse } from 'next/server';
import { UniversalEdgeTTS } from 'edge-tts-universal';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Cache directory for TTS audio files
const AUDIO_CACHE_DIR = path.join(process.cwd(), 'public', 'audio-cache');

// Ensure cache directory exists
if (!fs.existsSync(AUDIO_CACHE_DIR)) {
  fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });
}

// Generate cache key for TTS requests
function generateCacheKey(text: string, voice: string): string {
  const hash = crypto.createHash('md5').update(`${text}:${voice}`).digest('hex');
  return `${hash}.mp3`;
}

// Check if audio file exists in cache
function getCachedAudio(cacheKey: string): Buffer | null {
  const filePath = path.join(AUDIO_CACHE_DIR, cacheKey);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  }
  return null;
}

// Save audio to cache
function saveAudioToCache(cacheKey: string, audioBuffer: Buffer): void {
  const filePath = path.join(AUDIO_CACHE_DIR, cacheKey);
  fs.writeFileSync(filePath, audioBuffer);
}

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'en-GB-SoniaNeural' } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    console.log(`Generating TTS audio for: "${text.substring(0, 50)}..."`);

    // Generate cache key for this text
    const cacheKey = generateCacheKey(text, voice);

    // Check cache first
    let audioBuffer: Buffer;
    const cachedAudio = getCachedAudio(cacheKey);

    if (cachedAudio) {
      console.log(`Serving TTS from cache`);
      audioBuffer = cachedAudio;
    } else {
      // Generate new TTS audio
      console.log(`Generating new TTS audio with voice: ${voice}`);
      
      try {
        const tts = new UniversalEdgeTTS(text, voice);
        const result = await tts.synthesize();
        
        if (!result || !result.audio) {
          throw new Error('Failed to generate audio');
        }

        // Convert Blob to Buffer
        const arrayBuffer = await result.audio.arrayBuffer();
        audioBuffer = Buffer.from(arrayBuffer);
        console.log(`Generated audio buffer: ${audioBuffer.length} bytes`);

        // Cache the audio
        saveAudioToCache(cacheKey, audioBuffer);
        console.log(`Cached audio with key: ${cacheKey}`);
      } catch (ttsError) {
        console.error('UniversalEdgeTTS error:', ttsError);
        throw new Error(`TTS generation failed: ${ttsError instanceof Error ? ttsError.message : 'Unknown error'}`);
      }
    }

    // Set headers for audio file
    const headers = new Headers({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length.toString(),
      'Cache-Control': 'public, max-age=31536000',
    });

    return new NextResponse(Buffer.from(audioBuffer), {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate audio', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
