import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePanelTone } from "@/hooks/usePanelTone";

type Listener = () => void;

class MockImage {
  decoding = "";
  crossOrigin: string | null = null;
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

  set src(value: string) {
    queueMicrotask(() => {
      const type = value.includes("fail") ? "error" : "load";
      this.listeners.get(type)?.forEach((cb) => cb());
    });
  }
}

beforeEach(() => {
  vi.stubGlobal("Image", MockImage);
  (window as { Image: unknown }).Image = MockImage as unknown;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("usePanelTone", () => {
  it("defaults to light when no image source exists", () => {
    const { result } = renderHook(() => usePanelTone(null));
    expect(result.current).toBe("light");
  });

  it("switches to dark tone for bright sampled region", async () => {
    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
      if (tagName !== "canvas") {
        return originalCreateElement(tagName);
      }

      return {
        width: 0,
        height: 0,
        getContext: () => ({
          drawImage: vi.fn(),
          getImageData: () => ({
            data: new Uint8ClampedArray([255, 255, 255, 255, 255, 255, 255, 255]),
          }),
        }),
      } as unknown as HTMLCanvasElement;
    }) as typeof document.createElement);

    const { result } = renderHook(() => usePanelTone("https://example.com/scene.png"));

    await waitFor(() => {
      expect(result.current).toBe("dark");
    });
  });

  it("falls back to light when image load fails", async () => {
    const { result } = renderHook(() => usePanelTone("https://example.com/fail.png"));

    await waitFor(() => {
      expect(result.current).toBe("light");
    });
  });
});

