import "server-only";

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

declare global {
  var __lucidElevenLabs: ElevenLabsClient | undefined;
}

export function getElevenLabsClient(): ElevenLabsClient {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured.");
  }

  if (!globalThis.__lucidElevenLabs) {
    globalThis.__lucidElevenLabs = new ElevenLabsClient({
      apiKey
    });
  }

  return globalThis.__lucidElevenLabs;
}
