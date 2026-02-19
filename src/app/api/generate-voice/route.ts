import { ElevenLabsError } from "@elevenlabs/elevenlabs-js";
import { NextResponse } from "next/server";

import { createOptionsResponse, withCors } from "@/lib/cors";
import { getElevenLabsClient } from "@/lib/elevenlabs";
import { isRecord, readNonEmptyString, readOptionalString } from "@/lib/validation";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return createOptionsResponse(request);
}

const NARRATOR_VOICE_ID = "1ykC5GeLM4dP82qkyo91";
const NARRATOR_MODEL_ID = "eleven_multilingual_v2";
const WEB_OUTPUT_FORMAT = "mp3_44100_128";
const MOBILE_OUTPUT_FORMAT = "mp3_44100_192";

type GenerateVoiceRequestBody = {
  text?: unknown;
  clientPlatform?: unknown;
};

type ClientPlatform = "web" | "mobile";

const NARRATOR_VOICE_SETTINGS = {
  stability: 0.68,
  similarityBoost: 0.75,
  style: 0.2,
  useSpeakerBoost: true,
  speed: 0.9
} as const;

function readClientPlatform(value: unknown): ClientPlatform {
  const parsed = readOptionalString(value);
  return parsed === "mobile" ? "mobile" : "web";
}

export async function POST(request: Request) {
  let body: GenerateVoiceRequestBody;

  try {
    const requestBody = (await request.json()) as unknown;
    if (!isRecord(requestBody)) {
      return withCors(
        request,
        NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 }),
      );
    }

    body = requestBody as GenerateVoiceRequestBody;
  } catch {
    return withCors(request, NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }));
  }

  try {
    const text = readNonEmptyString(body.text, "text");
    const clientPlatform = readClientPlatform(body.clientPlatform);
    const client = getElevenLabsClient();

    const audioStream = await client.textToSpeech.convert(NARRATOR_VOICE_ID, {
      text,
      modelId: NARRATOR_MODEL_ID,
      outputFormat: clientPlatform === "mobile" ? MOBILE_OUTPUT_FORMAT : WEB_OUTPUT_FORMAT,
      applyTextNormalization: "on",
      voiceSettings: NARRATOR_VOICE_SETTINGS
    });

    return withCors(
      request,
      new Response(audioStream, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-store"
        }
      }),
    );
  } catch (error) {
    if (error instanceof ElevenLabsError) {
      return withCors(
        request,
        NextResponse.json(
          { error: error.message || "ElevenLabs voice generation failed." },
          { status: error.statusCode ?? 502 }
        ),
      );
    }

    const message =
      error instanceof Error ? error.message : "Unexpected voice generation failure.";
    const status = message.includes("ELEVENLABS_API_KEY") ? 500 : 502;
    return withCors(request, NextResponse.json({ error: message }, { status }));
  }
}
