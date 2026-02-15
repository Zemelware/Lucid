import { ElevenLabsError } from "@elevenlabs/elevenlabs-js";
import { NextResponse } from "next/server";

import { getElevenLabsClient } from "@/lib/elevenlabs";
import { isRecord, readNonEmptyString } from "@/lib/validation";

export const runtime = "nodejs";

const NARRATOR_VOICE_ID = "1ykC5GeLM4dP82qkyo91";
const NARRATOR_MODEL_ID = "eleven_multilingual_v2";
const OUTPUT_FORMAT = "mp3_44100_128";

type GenerateVoiceRequestBody = {
  text?: unknown;
};

const NARRATOR_VOICE_SETTINGS = {
  stability: 0.68,
  similarityBoost: 0.75,
  style: 0.2,
  useSpeakerBoost: true,
  speed: 0.9
} as const;

export async function POST(request: Request) {
  let body: GenerateVoiceRequestBody;

  try {
    const requestBody = (await request.json()) as unknown;
    if (!isRecord(requestBody)) {
      return NextResponse.json(
        { error: "Request body must be a JSON object." },
        { status: 400 }
      );
    }

    body = requestBody as GenerateVoiceRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const text = readNonEmptyString(body.text, "text");
    const client = getElevenLabsClient();

    const audioStream = await client.textToSpeech.convert(NARRATOR_VOICE_ID, {
      text,
      modelId: NARRATOR_MODEL_ID,
      outputFormat: OUTPUT_FORMAT,
      applyTextNormalization: "on",
      voiceSettings: NARRATOR_VOICE_SETTINGS
    });

    return new Response(audioStream, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    if (error instanceof ElevenLabsError) {
      return NextResponse.json(
        { error: error.message || "ElevenLabs voice generation failed." },
        { status: error.statusCode ?? 502 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Unexpected voice generation failure.";
    const status = message.includes("ELEVENLABS_API_KEY") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
