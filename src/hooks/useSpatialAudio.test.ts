import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSpatialAudio } from "@/hooks/useSpatialAudio";
import { useSettingsStore } from "@/store/use-settings-store";
import type { DreamAudioAssets } from "@/types/dream";

type Listener = () => void;

class MockAudio {
  static instances: MockAudio[] = [];
  preload = "";
  src = "";
  loop = false;
  crossOrigin: string | null = null;
  volume = 1;
  currentTime = 0;
  duration = 12;
  paused = true;
  ended = false;
  playCalls = 0;
  private readonly listeners = new Map<string, Set<Listener>>();

  constructor(src?: string) {
    if (src) {
      this.src = src;
    }
    MockAudio.instances.push(this);
  }

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
    this.playCalls += 1;
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
    this.listeners.get("loadedmetadata")?.forEach((cb) => cb());
    this.listeners.get("durationchange")?.forEach((cb) => cb());
    this.listeners.get("timeupdate")?.forEach((cb) => cb());
  }
}

class MockSourceNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockBufferSourceNode {
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn(() => {
    this.onended?.();
  });
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  buffer: AudioBuffer | null = null;
  onended: (() => void) | null = null;
}

class MockGainNode {
  connect = vi.fn();
  disconnect = vi.fn();
  gain = {
    setValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
  };
}

class MockPannerNode {
  connect = vi.fn();
  disconnect = vi.fn();
  positionX = { setValueAtTime: vi.fn() };
  positionY = { setValueAtTime: vi.fn() };
  positionZ = { setValueAtTime: vi.fn() };
}

class MockAudioContext {
  static instances: MockAudioContext[] = [];
  currentTime = 0;
  state: "suspended" | "running" = "suspended";
  destination = {} as AudioNode;
  createMediaElementSource = vi.fn(() => new MockSourceNode() as unknown as MediaElementAudioSourceNode);
  createBufferSource = vi.fn(() => new MockBufferSourceNode() as unknown as AudioBufferSourceNode);
  createGain = vi.fn(() => new MockGainNode() as unknown as GainNode);
  decodeAudioData = vi.fn(async () => ({ duration: 12 } as AudioBuffer));
  resume = vi.fn(async () => {
    this.state = "running";
  });
  suspend = vi.fn(async () => {
    this.state = "suspended";
  });
  close = vi.fn(async () => undefined);

  constructor() {
    MockAudioContext.instances.push(this);
  }
}

const SAMPLE_PREPARED_AUDIO: DreamAudioAssets = {
  narrator: {
    blobUrl: "blob:narrator",
    text: "narrator text",
  },
  sfx: [
    {
      blobUrl: "blob:rain",
      cue: {
        id: "rain",
        prompt: "soft rain",
        loop: true,
        volume: 0.9,
        start_sec: 0,
        end_sec: 8,
        position_start: { x: -4, y: 0, z: -2 },
        position_end: { x: -1, y: 0, z: -1 },
      },
    },
    {
      blobUrl: "blob:wind",
      cue: {
        id: "wind",
        prompt: "wind",
        loop: false,
        volume: 0.4,
        start_sec: 2,
        end_sec: 10,
        position_start: { x: 1, y: 0, z: 1 },
        position_end: { x: 4, y: 0, z: 3 },
      },
    },
  ],
  timeline: {
    total_duration_sec: 12,
    cues: [
      {
        id: "rain",
        prompt: "soft rain",
        loop: true,
        volume: 0.9,
        start_sec: 0,
        end_sec: 8,
        position_start: { x: -4, y: 0, z: -2 },
        position_end: { x: -1, y: 0, z: -1 },
      },
      {
        id: "wind",
        prompt: "wind",
        loop: false,
        volume: 0.4,
        start_sec: 2,
        end_sec: 10,
        position_start: { x: 1, y: 0, z: 1 },
        position_end: { x: 4, y: 0, z: 3 },
      },
    ],
  },
};

beforeEach(() => {
  MockAudio.instances = [];
  MockAudioContext.instances = [];
  useSettingsStore.setState({ isHighRes: false, sfxVolume: 1, sfxCueVolumes: {} });

  const contextCtor = vi.fn(() => new MockAudioContext()) as unknown as typeof AudioContext;
  (window as unknown as { AudioContext: typeof AudioContext }).AudioContext = contextCtor;
  (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext = undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(new Uint8Array([1, 2, 3, 4]).buffer, { status: 200 })),
  );
  vi.stubGlobal("Audio", MockAudio);
  vi.stubGlobal("PannerNode", MockPannerNode);
  window.requestAnimationFrame = vi.fn(() => 1);
  window.cancelAnimationFrame = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useSpatialAudio", () => {
  it("returns a descriptive error when play is called before audio is prepared", async () => {
    const { result } = renderHook(() => useSpatialAudio(null));

    let thrownMessage = "";
    await act(async () => {
      try {
        await result.current.play();
      } catch (error) {
        thrownMessage = error instanceof Error ? error.message : String(error);
      }
    });

    await waitFor(() => {
      expect(thrownMessage).toMatch(/not ready/i);
      expect(result.current.error).toBe("Dream audio is not ready yet.");
    });
  });

  it("plays, seeks, pauses, and stops when audio graph is initialized", async () => {
    const { result } = renderHook(() => useSpatialAudio(SAMPLE_PREPARED_AUDIO));

    await waitFor(() => {
      expect(MockAudioContext.instances.length).toBe(1);
      expect(MockAudioContext.instances[0]?.decodeAudioData).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      await result.current.play();
    });

    expect(MockAudio.instances.length).toBe(1);
    expect(MockAudio.instances[0]?.paused).toBe(false);
    expect(MockAudio.instances[0]?.loop).toBe(false);
    expect(MockAudioContext.instances[0]?.createBufferSource).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.seek(999);
    });
    expect(result.current.currentTimeSeconds).toBe(12);

    await act(async () => {
      await result.current.pause();
    });
    expect(MockAudio.instances.every((instance) => instance.paused === true)).toBe(true);

    act(() => {
      result.current.stop();
    });
    expect(result.current.currentTimeSeconds).toBe(0);
  });
});
