import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDreamAudio } from "@/hooks/useDreamAudio";
import { useAudioStore } from "@/store/use-audio-store";
import type { DreamSceneAnalysis } from "@/types/dream";

type Listener = () => void;

class MockAudio {
  preload = "";
  src = "";
  loop = false;
  crossOrigin: string | null = null;
  volume = 1;
  currentTime = 0;
  duration = 12;
  paused = true;
  ended = false;
  private readonly listeners = new Map<string, Set<Listener>>();

  addEventListener(type: string, cb: Listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)?.add(cb);
  }

  removeEventListener(type: string, cb: Listener) {
    this.listeners.get(type)?.delete(cb);
  }

  play() {
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }

  removeAttribute(name: string) {
    if (name === "src") {
      this.src = "";
    }
  }

  load() {
    queueMicrotask(() => {
      this.listeners.get("loadeddata")?.forEach((cb) => cb());
      this.listeners.get("canplaythrough")?.forEach((cb) => cb());
    });
  }
}

const SAMPLE_ANALYSIS: DreamSceneAnalysis = {
  narrative: "you walk through a quiet hall while distant rain circles the room.",
  timeline: {
    total_duration_sec: 60,
    cues: [
      {
        id: "rain",
        prompt: "soft rain",
        loop: true,
        volume: 0.8,
        start_sec: 0,
        end_sec: 24,
        position_start: { x: -4, y: 0, z: -2 },
        position_end: { x: -2, y: 0, z: -1 },
      },
      {
        id: "wind",
        prompt: "gentle wind",
        loop: false,
        volume: 0.5,
        start_sec: 20,
        end_sec: 40,
        position_start: { x: 1, y: 0, z: 2 },
        position_end: { x: 4, y: 0, z: 3 },
      },
    ],
  },
};

beforeEach(() => {
  useAudioStore.setState({ isPlaying: false, preparedAudio: null });
  vi.stubGlobal("Audio", MockAudio);
  let urlCounter = 0;
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => `blob:audio-${++urlCounter}`),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useDreamAudio", () => {
  it("prepares narrator + SFX audio and syncs store state", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => {
      return new Response(new Blob(["audio-bytes"]), {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useDreamAudio());

    let prepared = null as Awaited<ReturnType<typeof result.current.prepareAudio>>;
    await act(async () => {
      prepared = await result.current.prepareAudio(SAMPLE_ANALYSIS);
    });

    expect(prepared).not.toBeNull();
    expect(result.current.preparedAudio).not.toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isPreparingAudio).toBe(false);
    expect(useAudioStore.getState().preparedAudio).toEqual(result.current.preparedAudio);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/generate-voice");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/generate-sfx");
    expect(fetchMock.mock.calls[2]?.[0]).toBe("/api/generate-sfx");
    expect(
      JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)?.body)),
    ).toMatchObject({
      text: SAMPLE_ANALYSIS.narrative,
      clientPlatform: "web",
    });
    expect(
      JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit | undefined)?.body)),
    ).toMatchObject({
      text: SAMPLE_ANALYSIS.timeline.cues[0]?.prompt,
      clientPlatform: "web",
    });

    const urlApi = URL as unknown as {
      createObjectURL: ReturnType<typeof vi.fn>;
      revokeObjectURL: ReturnType<typeof vi.fn>;
    };
    expect(urlApi.createObjectURL).toHaveBeenCalledTimes(3);

    act(() => {
      result.current.clearPreparedAudio();
    });

    expect(result.current.preparedAudio).toBeNull();
    expect(useAudioStore.getState().preparedAudio).toBeNull();
    expect(urlApi.revokeObjectURL).toHaveBeenCalledTimes(3);
  });

  it("marks requests as mobile when running in a native Capacitor shell", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => {
      return new Response(new Blob(["audio-bytes"]), {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    (window as Window & { Capacitor?: { isNativePlatform: () => boolean } }).Capacitor = {
      isNativePlatform: () => true,
    };

    const { result } = renderHook(() => useDreamAudio());

    await act(async () => {
      await result.current.prepareAudio(SAMPLE_ANALYSIS);
    });

    expect(
      JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)?.body)),
    ).toMatchObject({
      clientPlatform: "mobile",
    });
    expect(
      JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit | undefined)?.body)),
    ).toMatchObject({
      clientPlatform: "mobile",
    });

    act(() => {
      result.current.clearPreparedAudio();
    });
  });

  it("returns null and sets error for invalid timelines", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const { result } = renderHook(() => useDreamAudio());

    const invalidAnalysis: DreamSceneAnalysis = {
      ...SAMPLE_ANALYSIS,
      timeline: { ...SAMPLE_ANALYSIS.timeline, cues: [] },
    };

    await act(async () => {
      const prepared = await result.current.prepareAudio(invalidAnalysis);
      expect(prepared).toBeNull();
    });

    expect(result.current.error).toMatch(/timeline is missing or invalid/i);
  });

  it("hydrates prepared audio directly from saved blobs", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useDreamAudio());
    const narratorBlob = new Blob(["saved-narrator"], { type: "audio/mpeg" });
    const sfxBlobs = [
      new Blob(["saved-rain"], { type: "audio/mpeg" }),
      new Blob(["saved-wind"], { type: "audio/mpeg" }),
    ];

    await act(async () => {
      await result.current.prepareAudioFromSnapshot({
        analysis: SAMPLE_ANALYSIS,
        narratorBlob,
        sfxBlobs,
      });
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
    expect(result.current.preparedAudio).not.toBeNull();
    expect(useAudioStore.getState().preparedAudio).toEqual(result.current.preparedAudio);
    expect(result.current.preparedAudio?.timeline).toEqual(SAMPLE_ANALYSIS.timeline);

    act(() => {
      result.current.clearPreparedAudio();
    });
  });

  it("surfaces non-OK API JSON error body", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => {
      return new Response(JSON.stringify({ error: "Sound generation failed." }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useDreamAudio());

    await act(async () => {
      const prepared = await result.current.prepareAudio(SAMPLE_ANALYSIS);
      expect(prepared).toBeNull();
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Sound generation failed.");
      expect(result.current.preparedAudio).toBeNull();
      expect(result.current.isPreparingAudio).toBe(false);
    });
  });
});
