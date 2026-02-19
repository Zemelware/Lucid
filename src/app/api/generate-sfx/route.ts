import { ElevenLabsError } from "@elevenlabs/elevenlabs-js";
import { NextResponse } from "next/server";

import { createOptionsResponse, withCors } from "@/lib/cors";
import { getElevenLabsClient } from "@/lib/elevenlabs";
import {
  clamp,
  isRecord,
  readNonEmptyString,
  readOptionalBoolean,
  readOptionalNumber,
  readOptionalString,
} from "@/lib/validation";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return createOptionsResponse(request);
}

const SFX_MODEL_ID = "eleven_text_to_sound_v2";
const WEB_OUTPUT_FORMAT = "mp3_44100_128";
const MOBILE_OUTPUT_FORMAT = "mp3_44100_96";

type GenerateSfxRequestBody = {
  text?: unknown;
  loop?: unknown;
  durationSeconds?: unknown;
  promptInfluence?: unknown;
  clientPlatform?: unknown;
};

type ClientPlatform = "web" | "mobile";

function readClientPlatform(value: unknown): ClientPlatform {
  const parsed = readOptionalString(value);
  return parsed === "mobile" ? "mobile" : "web";
}

export async function POST(request: Request) {
  let body: GenerateSfxRequestBody;

  try {
    const requestBody = (await request.json()) as unknown;
    if (!isRecord(requestBody)) {
      return withCors(
        request,
        NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 })
      );
    }

    body = requestBody as GenerateSfxRequestBody;
  } catch {
    return withCors(request, NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }));
  }

  try {
    const text = readNonEmptyString(body.text, "text");
    const loop = readOptionalBoolean(body.loop, "loop");
    const durationSeconds = readOptionalNumber(body.durationSeconds, "durationSeconds");
    const promptInfluence = readOptionalNumber(body.promptInfluence, "promptInfluence");
    const clientPlatform = readClientPlatform(body.clientPlatform);
    const client = getElevenLabsClient();

    const audioStream = await client.textToSoundEffects.convert({
      text,
      modelId: SFX_MODEL_ID,
      outputFormat: clientPlatform === "mobile" ? MOBILE_OUTPUT_FORMAT : WEB_OUTPUT_FORMAT,
      loop,
      durationSeconds:
        typeof durationSeconds === "number" ? clamp(durationSeconds, 0.5, 30) : undefined,
      promptInfluence:
        typeof promptInfluence === "number" ? clamp(promptInfluence, 0, 1) : undefined
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
          { error: error.message || "ElevenLabs sound-effect generation failed." },
          { status: error.statusCode ?? 502 }
        )
      );
    }

    const message =
      error instanceof Error ? error.message : "Unexpected sound-effect failure.";
    const status = message.includes("ELEVENLABS_API_KEY") ? 500 : 502;
    return withCors(request, NextResponse.json({ error: message }, { status }));
  }
}
