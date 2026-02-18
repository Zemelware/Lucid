import { describe, expect, it } from "vitest";

import { OPTIONS, POST } from "@/app/api/generate-voice/route";

describe("POST /api/generate-voice (integration)", () => {
  it("returns 400 on invalid JSON", async () => {
    const req = new Request("http://localhost/api/generate-voice", {
      method: "POST",
      body: "{not-json",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: expect.any(String) });
  });

  it("returns 500 when ELEVENLABS_API_KEY is missing", async () => {
    process.env.ELEVENLABS_API_KEY = "";

    const req = new Request("http://localhost/api/generate-voice", {
      method: "POST",
      body: JSON.stringify({ text: "hello" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringMatching(/ELEVENLABS_API_KEY/i),
    });
  });

  it("returns CORS headers for preflight", async () => {
    const req = new Request("http://localhost/api/generate-voice", {
      method: "OPTIONS",
      headers: { origin: "capacitor://localhost" },
    });

    const res = OPTIONS(req);
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("capacitor://localhost");
  });
});
