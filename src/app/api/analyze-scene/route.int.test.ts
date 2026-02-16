import { afterEach, describe, expect, it, vi } from "vitest";

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

import { POST } from "@/app/api/analyze-scene/route";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/analyze-scene", () => {
  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/api/analyze-scene", {
      method: "POST",
      body: "{oops",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: expect.any(String) });
  });

  it("returns 502 when image input is missing", async () => {
    const req = new Request("http://localhost/api/analyze-scene", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringMatching(/provide either imageDataUrl|imageUrl/i),
    });
  });

  it("retries after a failed model response and normalizes timeline fields", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    sendMock.mockReset();
    sendMock.mockRejectedValueOnce(new Error("temporary upstream issue"));
    sendMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              narrative: "you drift through warm static as distant rain folds into silence.",
              timeline: {
                total_duration_sec: 999,
                cues: [
                  {
                    id: "windFront",
                    prompt: "wind passing",
                    loop: true,
                    volume: 2.7,
                    start_sec: -4,
                    end_sec: 0,
                    fade_in_sec: 0.1,
                    fade_out_sec: 99,
                    position_start: { x: -14, y: 20, z: -100 },
                    position_end: { x: 14, y: -22, z: 19 },
                  },
                  {
                    id: "river_left",
                    prompt: "river stream",
                    loop: false,
                    volume: -2,
                    start_sec: 170,
                    end_sec: 180,
                    position_start: { x: -6, y: 0, z: -2 },
                    position_end: { x: -3, y: 0, z: -1 },
                  },
                ],
              },
            }),
          },
        },
      ],
    });

    const req = new Request("http://localhost/api/analyze-scene", {
      method: "POST",
      body: JSON.stringify({
        imageUrl: "https://example.com/scene.png",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      narrative: string;
      timeline: {
        total_duration_sec: number;
        cues: Array<{
          volume: number;
          start_sec: number;
          end_sec: number;
          fade_in_sec?: number;
          fade_out_sec?: number;
          position_start: { x: number; y: number; z: number };
          position_end: { x: number; y: number; z: number };
        }>;
      };
    };

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledTimes(1);

    expect(body.timeline.total_duration_sec).toBe(180);
    expect(body.timeline.cues).toHaveLength(2);

    expect(body.timeline.cues[0]).toMatchObject({
      volume: 1,
      start_sec: 0,
      end_sec: 0.5,
      fade_in_sec: 0.5,
      fade_out_sec: 5,
      position_start: { x: -10, y: 10, z: -10 },
      position_end: { x: 10, y: -10, z: 10 },
    });
    expect(body.timeline.cues[1]).toMatchObject({
      volume: 0,
    });
  });

  it("returns 502 after max retry attempts are exhausted", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    sendMock.mockReset();
    sendMock.mockRejectedValue(new Error("Model output was not valid JSON."));

    const req = new Request("http://localhost/api/analyze-scene", {
      method: "POST",
      body: JSON.stringify({
        imageDataUrl: "data:image/png;base64,AAA",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringMatching(/valid JSON/i),
    });
    expect(sendMock).toHaveBeenCalledTimes(3);
    expect(warnSpy).toHaveBeenCalledTimes(3);
  });
});

