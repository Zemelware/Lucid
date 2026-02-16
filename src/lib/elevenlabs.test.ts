import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { elevenCtorMock } = vi.hoisted(() => ({
  elevenCtorMock: vi.fn().mockImplementation((options: unknown) => ({ options })),
}));

vi.mock("@elevenlabs/elevenlabs-js", async () => {
  const actual = await vi.importActual("@elevenlabs/elevenlabs-js");
  return {
    ...actual,
    ElevenLabsClient: elevenCtorMock,
  };
});

describe("getElevenLabsClient", () => {
  beforeEach(() => {
    vi.resetModules();
    elevenCtorMock.mockClear();
    delete (globalThis as { __lucidElevenLabs?: unknown }).__lucidElevenLabs;
    delete process.env.ELEVENLABS_API_KEY;
  });

  afterEach(() => {
    delete (globalThis as { __lucidElevenLabs?: unknown }).__lucidElevenLabs;
  });

  it("throws when ELEVENLABS_API_KEY is missing", async () => {
    const { getElevenLabsClient } = await import("@/lib/elevenlabs");
    expect(() => getElevenLabsClient()).toThrow(/ELEVENLABS_API_KEY/i);
  });

  it("creates a singleton ElevenLabs client", async () => {
    process.env.ELEVENLABS_API_KEY = "test-key";
    const { getElevenLabsClient } = await import("@/lib/elevenlabs");

    const clientA = getElevenLabsClient();
    const clientB = getElevenLabsClient();

    expect(clientA).toBe(clientB);
    expect(elevenCtorMock).toHaveBeenCalledTimes(1);
    expect(elevenCtorMock).toHaveBeenCalledWith({ apiKey: "test-key" });
  });
});

