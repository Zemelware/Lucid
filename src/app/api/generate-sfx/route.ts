import { ElevenLabsError } from "@elevenlabs/elevenlabs-js";
import { NextResponse } from "next/server";

import { getElevenLabsClient } from "@/lib/elevenlabs";

export const runtime = "nodejs";

const SFX_MODEL_ID = "eleven_text_to_sound_v2";
const OUTPUT_FORMAT = "mp3_44100_128";

type GenerateSfxRequestBody = {
  text?: unknown;
  loop?: unknown;
  durationSeconds?: unknown;
  promptInfluence?: unknown;
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

function readOptionalBoolean(value: unknown, field: string): boolean | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new Error(`${field} must be a boolean.`);
  }

  return value;
}

function readOptionalNumber(value: unknown, field: string): number | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${field} must be a finite number.`);
  }

  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export async function POST(request: Request) {
  let body: GenerateSfxRequestBody;

  try {
    const requestBody = (await request.json()) as unknown;
    if (!isRecord(requestBody)) {
      return NextResponse.json(
        { error: "Request body must be a JSON object." },
        { status: 400 }
      );
    }

    body = requestBody as GenerateSfxRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const text = readNonEmptyString(body.text, "text");
    const loop = readOptionalBoolean(body.loop, "loop");
    const durationSeconds = readOptionalNumber(body.durationSeconds, "durationSeconds");
    const promptInfluence = readOptionalNumber(body.promptInfluence, "promptInfluence");
    const client = getElevenLabsClient();

    const audioStream = await client.textToSoundEffects.convert({
      text,
      modelId: SFX_MODEL_ID,
      outputFormat: OUTPUT_FORMAT,
      loop,
      durationSeconds:
        typeof durationSeconds === "number" ? clamp(durationSeconds, 0.5, 30) : undefined,
      promptInfluence:
        typeof promptInfluence === "number" ? clamp(promptInfluence, 0, 1) : undefined
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
        { error: error.message || "ElevenLabs sound-effect generation failed." },
        { status: error.statusCode ?? 502 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Unexpected sound-effect failure.";
    const status = message.includes("ELEVENLABS_API_KEY") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
