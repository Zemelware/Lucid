import type { Page, Route } from "@playwright/test";

type JsonResponse = {
  status: number;
  body: Record<string, unknown>;
};

type MockLucidApiOptions = {
  generateImage?: JsonResponse;
  analyzeScene?: JsonResponse;
  generateVoice?: {
    status: number;
    bytes?: Buffer;
    contentType?: string;
  };
  generateSfx?: {
    status: number;
    bytes?: Buffer;
    contentType?: string;
  };
};

const DEFAULT_IMAGE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+XvB0AAAAASUVORK5CYII=";

const DEFAULT_ANALYSIS = {
  narrative:
    "you breathe into a moonlit chamber as water traces the edge of your hearing and the air slowly circles behind you.",
  timeline: {
    total_duration_sec: 60,
    cues: [
      {
        id: "water_left",
        prompt: "gentle flowing water",
        loop: true,
        volume: 0.8,
        start_sec: 0,
        end_sec: 24,
        fade_in_sec: 1.5,
        fade_out_sec: 2,
        position_start: { x: -6, y: 0, z: -2 },
        position_end: { x: -4, y: 0, z: -1 },
      },
      {
        id: "air_behind",
        prompt: "soft rotating wind",
        loop: true,
        volume: 0.55,
        start_sec: 8,
        end_sec: 36,
        fade_in_sec: 1,
        fade_out_sec: 2,
        position_start: { x: 0, y: 0, z: -8 },
        position_end: { x: 2, y: 0, z: -5 },
      },
    ],
  },
} as const;

// Tiny valid WAV payload; enough for browser audio element loading.
const SILENT_WAV_BYTES = Buffer.from(
  "UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=",
  "base64",
);

async function fulfillJson(route: Route, status: number, body: Record<string, unknown>) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

export async function blockExternalProviderRequests(page: Page) {
  await page.route("https://api.elevenlabs.io/**", async (route) => route.abort("blockedbyclient"));
  await page.route("https://openrouter.ai/**", async (route) => route.abort("blockedbyclient"));
}

export async function mockLucidApiRoutes(page: Page, options: MockLucidApiOptions = {}) {
  const imageResponse = options.generateImage ?? {
    status: 200,
    body: {
      imageUrl: null,
      imageDataUrl: DEFAULT_IMAGE_DATA_URL,
    },
  };
  const analysisResponse = options.analyzeScene ?? {
    status: 200,
    body: DEFAULT_ANALYSIS as unknown as Record<string, unknown>,
  };
  const voiceResponse = options.generateVoice ?? {
    status: 200,
    bytes: SILENT_WAV_BYTES,
    contentType: "audio/wav",
  };
  const sfxResponse = options.generateSfx ?? {
    status: 200,
    bytes: SILENT_WAV_BYTES,
    contentType: "audio/wav",
  };

  await page.route("**/api/generate-image", async (route) => {
    await fulfillJson(route, imageResponse.status, imageResponse.body);
  });

  await page.route("**/api/analyze-scene", async (route) => {
    await fulfillJson(route, analysisResponse.status, analysisResponse.body);
  });

  await page.route("**/api/generate-voice", async (route) => {
    await route.fulfill({
      status: voiceResponse.status,
      body: voiceResponse.bytes ?? SILENT_WAV_BYTES,
      contentType: voiceResponse.contentType ?? "audio/wav",
    });
  });

  await page.route("**/api/generate-sfx", async (route) => {
    await route.fulfill({
      status: sfxResponse.status,
      body: sfxResponse.bytes ?? SILENT_WAV_BYTES,
      contentType: sfxResponse.contentType ?? "audio/wav",
    });
  });
}

