import { NextResponse } from "next/server";

import { getOpenRouterClient } from "@/lib/openrouter";
import { isRecord, readOptionalBoolean, readOptionalString } from "@/lib/validation";

export const runtime = "nodejs";

const MODEL_NAME_DEFAULT = "google/gemini-2.5-flash-image";
const MODEL_NAME_HIGH_RES = "google/gemini-3-pro-image-preview";

const SYSTEM_PROMPT = `
You are the image director for Lucid, an ASMR dreamscape generator.
Create one calming, immersive dream scene that feels liminal, cinematic, and surreal.
Always return exactly one image.
Avoid text overlays, logos, watermarks, split panels, and collage layouts.
`.trim();

const SCENE_SEED_EXAMPLES = [
  "a liminal hotel corridor at night with soft golden wall lights and floating dust motes",
  "an ethereal bedroom suspended above still moonlit water with gauzy curtains drifting",
  "a mystical forest path with glowing fireflies, distant fog, and pale blue bioluminescence",
  "a misty Japanese garden with lantern reflections in shallow water and soft twilight haze",
  "a glass observatory above clouds with constellations mirrored on polished black stone",
] as const;

const DATA_IMAGE_URL_PATTERN = /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g;
const HTTP_URL_PATTERN = /https?:\/\/[^\s"'`<>)\]}]+/g;

type GenerateImageRequestBody = {
  prompt?: unknown;
  random?: unknown;
  isHighRes?: unknown;
};

type GenerateImageResponseBody = {
  imageUrl: string | null;
  imageDataUrl: string | null;
};

function readOptionalPrompt(value: unknown): string | null {
  return readOptionalString(value);
}

function readBooleanFlag(value: unknown, field: string): boolean {
  const parsed = readOptionalBoolean(value, field);
  return parsed ?? false;
}

function formatSeedExamplesForPrompt(): string {
  return SCENE_SEED_EXAMPLES.map((seed, index) => `${index + 1}. ${seed}`).join("\n");
}

function normalizeCandidate(value: string): string {
  return value
    .trim()
    .replace(/^[("'`]+/g, "")
    .replace(/[)"'`]+$/g, "");
}

function collectUrlsFromText(text: string): string[] {
  const candidates = [
    ...(text.match(DATA_IMAGE_URL_PATTERN) ?? []),
    ...(text.match(HTTP_URL_PATTERN) ?? []),
  ];

  return candidates.map(normalizeCandidate).filter((candidate) => candidate.length > 0);
}

function isDataImageUrl(value: string): boolean {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/i.test(value);
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value);
}

function collectMessageImageCandidates(message: unknown): string[] {
  if (!isRecord(message)) {
    return [];
  }

  const candidates: string[] = [];

  if (Array.isArray(message.images)) {
    for (const image of message.images) {
      if (!isRecord(image) || !isRecord(image.imageUrl)) {
        continue;
      }

      if (typeof image.imageUrl.url === "string") {
        candidates.push(normalizeCandidate(image.imageUrl.url));
      }
    }
  }

  const content = message.content;
  if (typeof content === "string") {
    candidates.push(...collectUrlsFromText(content));
  } else if (Array.isArray(content)) {
    for (const item of content) {
      if (!isRecord(item)) {
        continue;
      }

      if (typeof item.text === "string") {
        candidates.push(...collectUrlsFromText(item.text));
      }

      if (isRecord(item.imageUrl) && typeof item.imageUrl.url === "string") {
        candidates.push(normalizeCandidate(item.imageUrl.url));
      }

      if (typeof item.url === "string") {
        candidates.push(normalizeCandidate(item.url));
      }
    }
  }

  return Array.from(new Set(candidates));
}

function readImageFromMessage(message: unknown): {
  imageUrl: string | null;
  imageDataUrl: string | null;
} {
  const candidates = collectMessageImageCandidates(message);
  const dataImageUrl = candidates.find(isDataImageUrl) ?? null;

  if (dataImageUrl) {
    return {
      imageUrl: null,
      imageDataUrl: dataImageUrl,
    };
  }

  const imageUrl = candidates.find(isHttpUrl) ?? null;
  if (imageUrl) {
    return {
      imageUrl,
      imageDataUrl: null,
    };
  }

  throw new Error("Model did not return a usable image.");
}

export async function POST(request: Request) {
  let body: GenerateImageRequestBody = {};

  try {
    const parsed = (await request.json()) as unknown;
    if (isRecord(parsed)) {
      body = parsed as GenerateImageRequestBody;
    }
  } catch {
    // Treat missing body as empty prompt.
  }

  try {
    const random = readBooleanFlag(body.random, "random");
    const isHighRes = readBooleanFlag(body.isHighRes, "isHighRes");
    const prompt = readOptionalPrompt(body.prompt);

    if (!random && !prompt) {
      return NextResponse.json(
        { error: "prompt is required unless random is true." },
        { status: 400 },
      );
    }

    const seedExamples = formatSeedExamplesForPrompt();
    const client = getOpenRouterClient();

    const completion = await client.chat.send({
      chatGenerationParams: {
        stream: false,
        model: isHighRes ? MODEL_NAME_HIGH_RES : MODEL_NAME_DEFAULT,
        temperature: 1,
        modalities: ["image", "text"],
        image_config: isHighRes
          ? {
              image_size: "2K",
            }
          : undefined,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `
Create a single high-quality image for Lucid.
Use these example scenes as inspiration only (do not copy them directly):
${seedExamples}

${random ? "Random mode: invent a brand-new scene direction yourself." : `Scene direction: ${prompt}`}

Tone: hypnotic, serene, liminal, dreamlike, cinematic.
Perspective: first-person viewpoint entering the space.
Lighting: soft and atmospheric with gentle depth haze.
Do not include any text, logos, watermarks, borders, or split layouts.
`.trim(),
          },
        ],
      } as any,
    });

    const image = readImageFromMessage(completion.choices[0]?.message);
    const responseBody: GenerateImageResponseBody = {
      imageUrl: image.imageUrl,
      imageDataUrl: image.imageDataUrl,
    };

    return NextResponse.json(responseBody);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected image generation failure.";
    const status = message.includes("OPENROUTER_API_KEY") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
