import { describe, expect, it, vi } from "vitest";

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}));

vi.mock("@/lib/openrouter", () => ({
  getOpenRouterClient: () => ({
    chat: {
      send: sendMock,
    },
  }),
}));

import { POST } from "@/app/api/generate-image/route";

describe("POST /api/generate-image", () => {
  it("returns 400 when prompt is missing and random is false", async () => {
    const req = new Request("http://localhost/api/generate-image", {
      method: "POST",
      body: JSON.stringify({ random: false }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringMatching(/prompt is required/i),
    });
  });

  it("parses data-image URL from model message text", async () => {
    sendMock.mockReset();
    sendMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content:
              "Here is your image: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA and done.",
          },
        },
      ],
    });

    const req = new Request("http://localhost/api/generate-image", {
      method: "POST",
      body: JSON.stringify({ random: true }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    await expect(res.json()).resolves.toEqual({
      imageUrl: null,
      imageDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA",
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const arg = sendMock.mock.calls[0]?.[0] as {
      chatGenerationParams: { model: string; messages: Array<{ content: string }> };
    };
    expect(arg.chatGenerationParams.model).toBe("google/gemini-2.5-flash-image");
    expect(arg.chatGenerationParams.messages[1]?.content).toContain("Random mode");
  });

  it("uses high-res model and parses HTTP image URL", async () => {
    sendMock.mockReset();
    sendMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            images: [
              {
                imageUrl: {
                  url: "https://cdn.example.com/lucid-scene.png",
                },
              },
            ],
          },
        },
      ],
    });

    const req = new Request("http://localhost/api/generate-image", {
      method: "POST",
      body: JSON.stringify({
        prompt: "moonlit observatory",
        isHighRes: true,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      imageUrl: "https://cdn.example.com/lucid-scene.png",
      imageDataUrl: null,
    });

    const arg = sendMock.mock.calls[0]?.[0] as {
      chatGenerationParams: { model: string; image_config?: { image_size?: string } };
    };
    expect(arg.chatGenerationParams.model).toBe("google/gemini-3-pro-image-preview");
    expect(arg.chatGenerationParams.image_config?.image_size).toBe("2K");
  });

  it("returns 502 when provider output has no usable image", async () => {
    sendMock.mockReset();
    sendMock.mockResolvedValueOnce({
      choices: [{ message: { content: "no usable url here" } }],
    });

    const req = new Request("http://localhost/api/generate-image", {
      method: "POST",
      body: JSON.stringify({ prompt: "misty room" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringMatching(/usable image/i),
    });
  });

  it("returns 500 when OpenRouter key is missing", async () => {
    sendMock.mockReset();
    sendMock.mockRejectedValueOnce(new Error("OPENROUTER_API_KEY is not configured."));

    const req = new Request("http://localhost/api/generate-image", {
      method: "POST",
      body: JSON.stringify({ random: true }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringMatching(/OPENROUTER_API_KEY/i),
    });
  });
});

