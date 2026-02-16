import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { openRouterCtorMock } = vi.hoisted(() => ({
  openRouterCtorMock: vi.fn().mockImplementation((options: unknown) => ({ options })),
}));

vi.mock("@openrouter/sdk", () => ({
  OpenRouter: openRouterCtorMock,
}));

describe("getOpenRouterClient", () => {
  beforeEach(() => {
    vi.resetModules();
    openRouterCtorMock.mockClear();
    delete (globalThis as { __lucidOpenRouter?: unknown }).__lucidOpenRouter;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  afterEach(() => {
    delete (globalThis as { __lucidOpenRouter?: unknown }).__lucidOpenRouter;
  });

  it("throws when OPENROUTER_API_KEY is missing", async () => {
    const { getOpenRouterClient } = await import("@/lib/openrouter");
    expect(() => getOpenRouterClient()).toThrow(/OPENROUTER_API_KEY/i);
  });

  it("creates a singleton with default app URL", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    const { getOpenRouterClient } = await import("@/lib/openrouter");

    const clientA = getOpenRouterClient();
    const clientB = getOpenRouterClient();

    expect(clientA).toBe(clientB);
    expect(openRouterCtorMock).toHaveBeenCalledTimes(1);
    expect(openRouterCtorMock).toHaveBeenCalledWith({
      apiKey: "test-key",
      httpReferer: "http://localhost:3000",
      xTitle: "Lucid",
    });
  });

  it("uses NEXT_PUBLIC_APP_URL when configured", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.NEXT_PUBLIC_APP_URL = "https://lucid.example.com";
    const { getOpenRouterClient } = await import("@/lib/openrouter");

    getOpenRouterClient();

    expect(openRouterCtorMock).toHaveBeenCalledTimes(1);
    expect(openRouterCtorMock).toHaveBeenCalledWith({
      apiKey: "test-key",
      httpReferer: "https://lucid.example.com",
      xTitle: "Lucid",
    });
  });
});

