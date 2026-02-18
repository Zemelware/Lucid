import { describe, expect, it, vi } from "vitest";

const { convertMock } = vi.hoisted(() => ({
  convertMock: vi.fn(),
}));

vi.mock("@/lib/elevenlabs", () => ({
  getElevenLabsClient: () => ({
    textToSoundEffects: {
      convert: convertMock,
    },
  }),
}));

import { OPTIONS, POST } from "@/app/api/generate-sfx/route";

describe("POST /api/generate-sfx", () => {
  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/api/generate-sfx", {
      method: "POST",
      body: "{bad-json",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: expect.any(String) });
  });

  it("returns 400 for non-object JSON body", async () => {
    const req = new Request("http://localhost/api/generate-sfx", {
      method: "POST",
      body: JSON.stringify(["not-an-object"]),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: expect.any(String) });
  });

  it("clamps provider params and returns audio stream", async () => {
    convertMock.mockReset();
    convertMock.mockResolvedValueOnce(Uint8Array.from([1, 2, 3]));

    const req = new Request("http://localhost/api/generate-sfx", {
      method: "POST",
      body: JSON.stringify({
        text: "rain on glass",
        loop: true,
        durationSeconds: 99,
        promptInfluence: -2,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/audio\/mpeg/i);

    const body = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(body)).toEqual([1, 2, 3]);

    expect(convertMock).toHaveBeenCalledTimes(1);
    expect(convertMock).toHaveBeenCalledWith({
      text: "rain on glass",
      modelId: "eleven_text_to_sound_v2",
      outputFormat: "mp3_44100_128",
      loop: true,
      durationSeconds: 30,
      promptInfluence: 0,
    });
  });

  it("returns 500 when provider client errors with missing key", async () => {
    convertMock.mockReset();
    convertMock.mockRejectedValueOnce(new Error("ELEVENLABS_API_KEY is not configured."));

    const req = new Request("http://localhost/api/generate-sfx", {
      method: "POST",
      body: JSON.stringify({ text: "wind" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringMatching(/ELEVENLABS_API_KEY/i),
    });
  });

  it("returns CORS headers for preflight", async () => {
    const req = new Request("http://localhost/api/generate-sfx", {
      method: "OPTIONS",
      headers: { origin: "capacitor://localhost" },
    });

    const res = OPTIONS(req);
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("capacitor://localhost");
  });
});
