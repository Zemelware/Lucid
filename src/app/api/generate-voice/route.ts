import { ElevenLabsError } from "@elevenlabs/elevenlabs-js";
import { NextResponse } from "next/server";

import { getElevenLabsClient } from "@/lib/elevenlabs";

export const runtime = "nodejs";

const NARRATOR_VOICE_ID = "1ykC5GeLM4dP82qkyo91";
const NARRATOR_MODEL_ID = "eleven_multilingual_v2";
const OUTPUT_FORMAT = "mp3_44100_128";

type GenerateVoiceRequestBody = {
  text?: unknown;
  mood?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }

  return value.trim();
}

function readOptionalString(value: unknown, field: string): string | null {
  if (typeof value === "undefined") {
    return null;
  }

  return readNonEmptyString(value, field);
}

function selectVoiceSettings(mood: string | null) {
  const normalizedMood = mood?.toLowerCase() ?? "";

  if (
    normalizedMood.includes("whisper") ||
    normalizedMood.includes("soft") ||
    normalizedMood.includes("calm")
  ) {
    return {
      stability: 0.68,
      similarityBoost: 0.75,
      style: 0.2,
      useSpeakerBoost: true,
      speed: 0.9
    };
  }

  if (
    normalizedMood.includes("eerie") ||
    normalizedMood.includes("mystic") ||
    normalizedMood.includes("cinematic")
  ) {
    return {
      stability: 0.48,
      similarityBoost: 0.74,
      style: 0.58,
      useSpeakerBoost: true,
      speed: 0.92
    };
  }

  return {
    stability: 0.57,
    similarityBoost: 0.75,
    style: 0.35,
    useSpeakerBoost: true,
    speed: 0.92
  };
}

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
    const mood = readOptionalString(body.mood, "mood");
    const client = getElevenLabsClient();

    const audioStream = await client.textToSpeech.convert(NARRATOR_VOICE_ID, {
      text,
      modelId: NARRATOR_MODEL_ID,
      outputFormat: OUTPUT_FORMAT,
      applyTextNormalization: "on",
      voiceSettings: selectVoiceSettings(mood)
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
