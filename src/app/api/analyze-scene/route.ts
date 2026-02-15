import { NextResponse } from "next/server";

import { getOpenRouterClient } from "@/lib/openrouter";
import {
  clamp,
  isRecord,
  readBoolean,
  readNonEmptyString,
  readNumber,
  readOptionalNumber,
} from "@/lib/validation";
import type { DreamSceneAnalysis, DreamTimeline, Position3D, TimelineSfxCue } from "@/types/dream";

export const runtime = "nodejs";

const MODEL_NAME = "google/gemini-3-flash-preview";

const SYSTEM_PROMPT = `
You are a Dream Director for Lucid.
Analyze the provided image and produce a hypnotic second-person narrative.
Design a timed dream timeline.
Create between 2 and 5 distinct sound cues with movement over time.
Each cue must define both start and end 3D positions.
Coordinates must be in range -10 to 10 for x, y, z.
Return only valid JSON. Do not include markdown, commentary, or extra keys.
`.trim();

const USER_PROMPT = `
Generate a dream analysis object with this structure:
{
  "narrative": string,
  "timeline": {
    "total_duration_sec": number,
    "cues": [
      {
        "id": string,
        "prompt": string,
        "loop": boolean,
        "volume": number,
        "start_sec": number,
        "end_sec": number,
        "fade_in_sec": number,
        "fade_out_sec": number,
        "position_start": { "x": number, "y": number, "z": number },
        "position_end": { "x": number, "y": number, "z": number }
      }
    ]
  }
}

Requirements:
- narrative: 110-190 words, second-person, hypnotic, sensory.
- timeline.total_duration_sec: 45-120 seconds.
- cues: 2 to 5 items, each distinct and spatially meaningful.
- cue timing must be within total_duration_sec.
- volume: range 0.0 to 1.0.
- fade_in_sec and fade_out_sec: 0.5 to 5 seconds.
`.trim();

const DREAM_ANALYSIS_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["narrative", "timeline"],
  properties: {
    narrative: {
      type: "string",
      minLength: 60,
    },
    timeline: {
      type: "object",
      additionalProperties: false,
      required: ["total_duration_sec", "cues"],
      properties: {
        total_duration_sec: {
          type: "number",
          minimum: 20,
          maximum: 180,
        },
        cues: {
          type: "array",
          minItems: 2,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "id",
              "prompt",
              "loop",
              "volume",
              "start_sec",
              "end_sec",
              "fade_in_sec",
              "fade_out_sec",
              "position_start",
              "position_end",
            ],
            properties: {
              id: {
                type: "string",
                minLength: 1,
              },
              prompt: {
                type: "string",
                minLength: 3,
              },
              loop: {
                type: "boolean",
              },
              volume: {
                type: "number",
                minimum: 0,
                maximum: 1,
              },
              start_sec: {
                type: "number",
                minimum: 0,
              },
              end_sec: {
                type: "number",
                minimum: 0,
              },
              fade_in_sec: {
                type: "number",
                minimum: 0.5,
                maximum: 5,
              },
              fade_out_sec: {
                type: "number",
                minimum: 0.5,
                maximum: 5,
              },
              position_start: {
                type: "object",
                additionalProperties: false,
                required: ["x", "y", "z"],
                properties: {
                  x: { type: "number", minimum: -10, maximum: 10 },
                  y: { type: "number", minimum: -10, maximum: 10 },
                  z: { type: "number", minimum: -10, maximum: 10 },
                },
              },
              position_end: {
                type: "object",
                additionalProperties: false,
                required: ["x", "y", "z"],
                properties: {
                  x: { type: "number", minimum: -10, maximum: 10 },
                  y: { type: "number", minimum: -10, maximum: 10 },
                  z: { type: "number", minimum: -10, maximum: 10 },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

type AnalyzeSceneRequestBody = {
  imageUrl?: unknown;
  imageDataUrl?: unknown;
};

function readImageInput(body: AnalyzeSceneRequestBody): string {
  if (typeof body.imageDataUrl === "string" && body.imageDataUrl.startsWith("data:image/")) {
    return body.imageDataUrl;
  }

  if (typeof body.imageUrl === "string" && /^https?:\/\//.test(body.imageUrl)) {
    return body.imageUrl;
  }

  throw new Error("Provide either imageDataUrl (data:image/*) or imageUrl (https://...).");
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

function parseModelJson(content: string): unknown {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new Error("Model output was not valid JSON.");
  }
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

function normalizeTimelineDuration(value: number): number {
  return clamp(value, 20, 180);
}

function normalizeCueWindow(startSec: number, endSec: number, totalDuration: number) {
  const minCueDuration = 0.5;

  let normalizedStart = clamp(startSec, 0, totalDuration);
  let normalizedEnd = clamp(endSec, 0, totalDuration);

  if (normalizedEnd - normalizedStart < minCueDuration) {
    normalizedStart = Math.min(normalizedStart, Math.max(0, totalDuration - minCueDuration));
    normalizedEnd = Math.min(totalDuration, normalizedStart + minCueDuration);
  }

  if (normalizedEnd <= normalizedStart) {
    normalizedStart = 0;
    normalizedEnd = Math.min(totalDuration, minCueDuration);
  }

  return {
    startSec: normalizedStart,
    endSec: normalizedEnd,
  };
}

function parseTimelineCue(value: unknown, index: number, totalDuration: number): TimelineSfxCue {
  if (!isRecord(value)) {
    throw new Error(`timeline.cues[${index}] must be an object.`);
  }

  const startSec = readNumber(value.start_sec, `timeline.cues[${index}].start_sec`);
  const endSec = readNumber(value.end_sec, `timeline.cues[${index}].end_sec`);
  const normalizedWindow = normalizeCueWindow(startSec, endSec, totalDuration);

  const fadeIn = readOptionalNumber(value.fade_in_sec, `timeline.cues[${index}].fade_in_sec`);
  const fadeOut = readOptionalNumber(value.fade_out_sec, `timeline.cues[${index}].fade_out_sec`);

  return {
    id: readNonEmptyString(value.id, `timeline.cues[${index}].id`),
    prompt: readNonEmptyString(value.prompt, `timeline.cues[${index}].prompt`),
    loop: readBoolean(value.loop, `timeline.cues[${index}].loop`),
    volume: clamp(readNumber(value.volume, `timeline.cues[${index}].volume`), 0, 1),
    start_sec: normalizedWindow.startSec,
    end_sec: normalizedWindow.endSec,
    fade_in_sec: typeof fadeIn === "number" ? clamp(fadeIn, 0.5, 5) : undefined,
    fade_out_sec: typeof fadeOut === "number" ? clamp(fadeOut, 0.5, 5) : undefined,
    position_start: parsePosition3D(
      value.position_start,
      `timeline.cues[${index}].position_start`,
    ),
    position_end: parsePosition3D(value.position_end, `timeline.cues[${index}].position_end`),
  };
}

function parseTimeline(value: unknown): DreamTimeline {
  if (!isRecord(value)) {
    throw new Error("timeline must be an object.");
  }

  const totalDuration = normalizeTimelineDuration(
    readNumber(value.total_duration_sec, "timeline.total_duration_sec"),
  );

  const cuesValue = value.cues;
  if (!Array.isArray(cuesValue) || cuesValue.length < 2 || cuesValue.length > 5) {
    throw new Error("timeline.cues must contain between 2 and 5 items.");
  }

  const normalizedCues = cuesValue.map((cue, index) => parseTimelineCue(cue, index, totalDuration));

  return {
    total_duration_sec: totalDuration,
    cues: normalizedCues,
  };
}

function parseDreamSceneAnalysis(value: unknown): DreamSceneAnalysis {
  if (!isRecord(value)) {
    throw new Error("Response must be a JSON object.");
  }

  return {
    narrative: readNonEmptyString(value.narrative, "narrative"),
    timeline: parseTimeline(value.timeline),
  };
}

const MAX_ANALYSIS_ATTEMPTS = 3;

function buildMessages(imageInput: string) {
  return [
    {
      role: "system" as const,
      content: SYSTEM_PROMPT,
    },
    {
      role: "user" as const,
      content: [
        {
          type: "text" as const,
          text: USER_PROMPT,
        },
        {
          type: "image_url" as const,
          imageUrl: {
            url: imageInput,
            detail: "high" as const,
          },
        },
      ],
    },
  ];
}

async function requestStrictJsonAnalysis(imageInput: string) {
  const client = getOpenRouterClient();
  return client.chat.send({
    chatGenerationParams: {
      stream: false,
      model: MODEL_NAME,
      temperature: 0.8,
      messages: buildMessages(imageInput),
      responseFormat: {
        type: "json_schema",
        jsonSchema: {
          name: "dream_scene_analysis_timeline",
          strict: true,
          schema: DREAM_ANALYSIS_RESPONSE_SCHEMA,
        },
      },
    },
  });
}

function parseCompletionAnalysis(completion: { choices?: Array<{ message?: { content?: unknown } }> }) {
  const modelContent = extractTextContent(completion.choices?.[0]?.message?.content);
  if (!modelContent) {
    throw new Error("Model returned an empty response.");
  }

  const parsed = parseModelJson(modelContent);
  return parseDreamSceneAnalysis(parsed);
}

export async function POST(request: Request) {
  let body: AnalyzeSceneRequestBody;

  try {
    const requestBody = (await request.json()) as unknown;
    if (!isRecord(requestBody)) {
      return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
    }

    body = requestBody as AnalyzeSceneRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const imageInput = readImageInput(body);
    let lastError: unknown = null;
    let analysis: DreamSceneAnalysis | null = null;

    for (let attempt = 1; attempt <= MAX_ANALYSIS_ATTEMPTS; attempt += 1) {
      try {
        const strictCompletion = await requestStrictJsonAnalysis(imageInput);
        analysis = parseCompletionAnalysis(strictCompletion);
        break;
      } catch (attemptError) {
        lastError = attemptError;
        const message = attemptError instanceof Error ? attemptError.message : String(attemptError);
        console.warn(
          `[Lucid] analyze-scene attempt ${attempt}/${MAX_ANALYSIS_ATTEMPTS} failed.`,
          message,
        );
      }
    }

    if (!analysis) {
      throw (
        lastError instanceof Error
          ? lastError
          : new Error("Model response was invalid after retrying analysis.")
      );
    }

    console.log("[Lucid] Gemini timeline analysis:", JSON.stringify(analysis, null, 2));
    return NextResponse.json(analysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected analyze-scene failure.";
    const status = message.includes("OPENROUTER_API_KEY") ? 500 : 502;

    return NextResponse.json({ error: message }, { status });
  }
}
