import { NextResponse } from "next/server";

import { getOpenRouterClient } from "@/lib/openrouter";
import type { DreamSceneAnalysis, Position3D, SfxCue } from "@/types/dream";

export const runtime = "nodejs";

const MODEL_NAME = "google/gemini-3-flash-preview";

const SYSTEM_PROMPT = `
You are a Dream Guide.
Analyze the provided image and produce a hypnotic second-person narrative.
Identify exactly 3 distinct environmental sound sources from the scene.
Each sound source must have strict 3D coordinates:
- x controls left/right and must be between -10 and 10.
- z controls front/back and must be between -10 and 10.
- y controls vertical placement and must be between -10 and 10.
Return only valid JSON. Do not include markdown, commentary, or extra keys.
`.trim();

const USER_PROMPT = `
Generate a dream analysis object with this structure:
{
  "narrative": string,
  "mood": string,
  "sfx_cues": [
    {
      "prompt": string,
      "position_3d": { "x": number, "y": number, "z": number },
      "loop": boolean,
      "volume": number
    }
  ]
}

Requirements:
- narrative: 110-190 words, second-person, hypnotic, sensory.
- mood: short style keywords for voice synthesis.
- sfx_cues: exactly 3 items, each distinct.
- volume: range 0.0 to 1.0.
`.trim();

const DREAM_ANALYSIS_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["narrative", "mood", "sfx_cues"],
  properties: {
    narrative: {
      type: "string",
      minLength: 60
    },
    mood: {
      type: "string",
      minLength: 2
    },
    sfx_cues: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["prompt", "position_3d", "loop", "volume"],
        properties: {
          prompt: {
            type: "string",
            minLength: 3
          },
          position_3d: {
            type: "object",
            additionalProperties: false,
            required: ["x", "y", "z"],
            properties: {
              x: { type: "number", minimum: -10, maximum: 10 },
              y: { type: "number", minimum: -10, maximum: 10 },
              z: { type: "number", minimum: -10, maximum: 10 }
            }
          },
          loop: {
            type: "boolean"
          },
          volume: {
            type: "number",
            minimum: 0,
            maximum: 1
          }
        }
      }
    }
  }
} as const;

type AnalyzeSceneRequestBody = {
  imageUrl?: unknown;
  imageDataUrl?: unknown;
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

function readBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${field} must be a boolean.`);
  }

  return value;
}

function readNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${field} must be a finite number.`);
  }

  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readImageInput(body: AnalyzeSceneRequestBody): string {
  if (
    typeof body.imageDataUrl === "string" &&
    body.imageDataUrl.startsWith("data:image/")
  ) {
    return body.imageDataUrl;
  }

  if (typeof body.imageUrl === "string" && /^https?:\/\//.test(body.imageUrl)) {
    return body.imageUrl;
  }

  throw new Error(
    "Provide either imageDataUrl (data:image/*) or imageUrl (https://...)."
  );
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  const textChunks = content
    .map((item) => {
      if (!isRecord(item)) {
        return "";
      }

      if (item.type === "text" && typeof item.text === "string") {
        return item.text;
      }

      return "";
    })
    .filter((chunk) => chunk.length > 0);

  return textChunks.join("\n").trim();
}

function tryParseJson(input: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(input) as unknown };
  } catch {
    return { ok: false };
  }
}

function parseModelJson(content: string): unknown {
  const direct = tryParseJson(content);
  if (direct.ok) {
    return direct.value;
  }

  const fencedJsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedJsonMatch?.[1]) {
    const fenced = tryParseJson(fencedJsonMatch[1].trim());
    if (fenced.ok) {
      return fenced.value;
    }
  }

  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const cropped = tryParseJson(content.slice(firstBrace, lastBrace + 1));
    if (cropped.ok) {
      return cropped.value;
    }
  }

  throw new Error("Model output was not valid JSON.");
}

function parsePosition3D(value: unknown, path: string): Position3D {
  if (!isRecord(value)) {
    throw new Error(`${path} must be an object.`);
  }

  const x = clamp(readNumber(value.x, `${path}.x`), -10, 10);
  const y = clamp(readNumber(value.y, `${path}.y`), -10, 10);
  const z = clamp(readNumber(value.z, `${path}.z`), -10, 10);

  return { x, y, z };
}

function parseSfxCue(value: unknown, index: number): SfxCue {
  if (!isRecord(value)) {
    throw new Error(`sfx_cues[${index}] must be an object.`);
  }

  return {
    prompt: readNonEmptyString(value.prompt, `sfx_cues[${index}].prompt`),
    position_3d: parsePosition3D(
      value.position_3d,
      `sfx_cues[${index}].position_3d`
    ),
    loop: readBoolean(value.loop, `sfx_cues[${index}].loop`),
    volume: clamp(readNumber(value.volume, `sfx_cues[${index}].volume`), 0, 1)
  };
}

function parseDreamSceneAnalysis(value: unknown): DreamSceneAnalysis {
  if (!isRecord(value)) {
    throw new Error("Response must be a JSON object.");
  }

  const cuesValue = value.sfx_cues;
  if (!Array.isArray(cuesValue) || cuesValue.length !== 3) {
    throw new Error("sfx_cues must contain exactly 3 items.");
  }

  const sfxCues = cuesValue.map((cue, index) => parseSfxCue(cue, index));

  return {
    narrative: readNonEmptyString(value.narrative, "narrative"),
    mood: readNonEmptyString(value.mood, "mood"),
    sfx_cues: [sfxCues[0], sfxCues[1], sfxCues[2]]
  };
}

export async function POST(request: Request) {
  let body: AnalyzeSceneRequestBody;

  try {
    const requestBody = (await request.json()) as unknown;
    if (!isRecord(requestBody)) {
      return NextResponse.json(
        { error: "Request body must be a JSON object." },
        { status: 400 }
      );
    }

    body = requestBody as AnalyzeSceneRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  try {
    const imageInput = readImageInput(body);
    const client = getOpenRouterClient();

    const completion = await client.chat.send({
      chatGenerationParams: {
        stream: false,
        model: MODEL_NAME,
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: USER_PROMPT
              },
              {
                type: "image_url",
                imageUrl: {
                  url: imageInput,
                  detail: "high"
                }
              }
            ]
          }
        ],
        responseFormat: {
          type: "json_schema",
          jsonSchema: {
            name: "dream_scene_analysis",
            strict: true,
            schema: DREAM_ANALYSIS_RESPONSE_SCHEMA
          }
        }
      }
    });

    const modelContent = extractTextContent(completion.choices[0]?.message?.content);
    if (!modelContent) {
      return NextResponse.json(
        { error: "Model returned an empty response." },
        { status: 502 }
      );
    }

    const parsed = parseModelJson(modelContent);
    const analysis = parseDreamSceneAnalysis(parsed);

    return NextResponse.json(analysis);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected analyze-scene failure.";

    const status = message.includes("OPENROUTER_API_KEY") ? 500 : 502;

    return NextResponse.json({ error: message }, { status });
  }
}
