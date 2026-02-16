import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSceneAnalysis } from "@/hooks/useSceneAnalysis";
import type { DreamSceneAnalysis } from "@/types/dream";

const SAMPLE_ANALYSIS: DreamSceneAnalysis = {
  narrative: "you move through a calm corridor where distant rain circles your breath.",
  timeline: {
    total_duration_sec: 60,
    cues: [
      {
        id: "rain",
        prompt: "soft rain",
        loop: true,
        volume: 0.8,
        start_sec: 0,
        end_sec: 30,
        position_start: { x: -4, y: 0, z: -2 },
        position_end: { x: -1, y: 0, z: -1 },
      },
      {
        id: "wind",
        prompt: "warm wind",
        loop: false,
        volume: 0.4,
        start_sec: 20,
        end_sec: 40,
        position_start: { x: 2, y: 0, z: 1 },
        position_end: { x: 5, y: 0, z: 2 },
      },
    ],
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useSceneAnalysis", () => {
  it("posts to analyze endpoint and stores analysis on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => SAMPLE_ANALYSIS,
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSceneAnalysis());

    await act(async () => {
      const analysis = await result.current.analyzeScene({
        imageUrl: "https://example.com/scene.png",
      });
      expect(analysis).toEqual(SAMPLE_ANALYSIS);
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/analyze-scene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: "https://example.com/scene.png" }),
    });

    expect(result.current.analysis).toEqual(SAMPLE_ANALYSIS);
    expect(result.current.error).toBeNull();
    expect(result.current.isAnalyzing).toBe(false);
  });

  it("surfaces API error message when request fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Model refused input." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSceneAnalysis());

    let thrownMessage = "";
    await act(async () => {
      try {
        await result.current.analyzeScene({ imageDataUrl: "data:image/png;base64,AAA" });
      } catch (error) {
        thrownMessage = error instanceof Error ? error.message : String(error);
      }
    });

    await waitFor(() => {
      expect(thrownMessage).toMatch(/Model refused input/i);
      expect(result.current.error).toBe("Model refused input.");
      expect(result.current.isAnalyzing).toBe(false);
    });
  });

  it("clearAnalysis resets analysis and error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => SAMPLE_ANALYSIS,
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSceneAnalysis());

    await act(async () => {
      await result.current.analyzeScene({ imageUrl: "https://example.com/scene.png" });
    });

    act(() => {
      result.current.clearAnalysis();
    });

    expect(result.current.analysis).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
