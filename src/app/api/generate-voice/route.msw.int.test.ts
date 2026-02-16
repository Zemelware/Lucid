import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { POST } from "@/app/api/generate-voice/route";

const server = setupServer();

type SeenRequest = {
  url: URL;
  apiKeyHeader: string | null;
  jsonBody: unknown;
};

let seen: SeenRequest | null = null;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
  seen = null;
});

afterAll(() => {
  server.close();
});

describe("POST /api/generate-voice (integration via MSW)", () => {
  it("returns audio/mpeg on success and sends expected upstream request shape", async () => {
    process.env.ELEVENLABS_API_KEY = "test-eleven-key";

    const audioBytes = Uint8Array.from([0x4c, 0x55, 0x43, 0x49, 0x44]); // "LUCID"

    server.use(
      http.post("https://api.elevenlabs.io/v1/text-to-speech/:voiceId", async ({ request }) => {
        const url = new URL(request.url);
        const apiKeyHeader = request.headers.get("xi-api-key");
        const jsonBody = await request.json().catch(() => null);

        seen = { url, apiKeyHeader, jsonBody };

        return HttpResponse.arrayBuffer(audioBytes.buffer, {
          status: 200,
          headers: { "Content-Type": "audio/mpeg" },
        });
      })
    );

    const req = new Request("http://localhost/api/generate-voice", {
      method: "POST",
      body: JSON.stringify({ text: "hello from test" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/audio\/mpeg/i);

    const buf = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(buf)).toEqual(Array.from(audioBytes));

    expect(seen).not.toBeNull();
    expect(seen?.apiKeyHeader).toBe("test-eleven-key");
    expect(seen?.url.pathname).toMatch(/\/v1\/text-to-speech\//);
    expect(seen?.url.searchParams.get("output_format")).toBe("mp3_44100_128");

    // The ElevenLabs SDK serializes these keys to snake_case.
    expect(seen?.jsonBody).toMatchObject({
      text: "hello from test",
      model_id: "eleven_multilingual_v2",
      apply_text_normalization: "on",
      voice_settings: expect.any(Object),
    });
  });

  it("surfaces upstream non-2xx status codes", async () => {
    process.env.ELEVENLABS_API_KEY = "test-eleven-key";

    server.use(
      http.post("https://api.elevenlabs.io/v1/text-to-speech/:voiceId", async () => {
        return HttpResponse.json({ detail: "rate limited" }, { status: 429 });
      })
    );

    const req = new Request("http://localhost/api/generate-voice", {
      method: "POST",
      body: JSON.stringify({ text: "hello" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toMatchObject({ error: expect.any(String) });
  });
});

