import "server-only";

import { OpenRouter } from "@openrouter/sdk";

declare global {
  var __lucidOpenRouter: OpenRouter | undefined;
}

const DEFAULT_APP_URL = "http://localhost:3000";

export function getOpenRouterClient(): OpenRouter {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  if (!globalThis.__lucidOpenRouter) {
    globalThis.__lucidOpenRouter = new OpenRouter({
      apiKey,
      httpReferer: process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL,
      xTitle: "Lucid"
    });
  }

  return globalThis.__lucidOpenRouter;
}
