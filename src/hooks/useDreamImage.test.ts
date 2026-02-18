import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useDreamImage } from "@/hooks/useDreamImage";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useDreamImage", () => {
  it("returns parsed image URLs on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        imageUrl: "https://cdn.example.com/scene.png",
        imageDataUrl: null,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useDreamImage());

    await act(async () => {
      const generated = await result.current.generateImage({
        prompt: "moonlit hall",
        random: false,
        isHighRes: true,
      });

      expect(generated).toEqual({
        imageUrl: "https://cdn.example.com/scene.png",
        imageDataUrl: null,
      });
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "moonlit hall",
        random: false,
        isHighRes: true,
      }),
    });
    expect(result.current.error).toBeNull();
    expect(result.current.isGeneratingImage).toBe(false);
  });

  it("sets error and throws provider error message for non-ok response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Provider overloaded." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useDreamImage());

    let thrownMessage = "";
    await act(async () => {
      try {
        await result.current.generateImage({ random: true });
      } catch (error) {
        thrownMessage = error instanceof Error ? error.message : String(error);
      }
    });

    await waitFor(() => {
      expect(thrownMessage).toMatch(/Provider overloaded/i);
      expect(result.current.error).toBe("Provider overloaded.");
      expect(result.current.isGeneratingImage).toBe(false);
    });
  });

  it("throws when API response contains no usable image", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        imageUrl: "",
        imageDataUrl: " ",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useDreamImage());

    let thrownMessage = "";
    await act(async () => {
      try {
        await result.current.generateImage({ random: true });
      } catch (error) {
        thrownMessage = error instanceof Error ? error.message : String(error);
      }
    });
    expect(thrownMessage).toMatch(/did not return an image/i);
  });

  it("clearError resets hook error state", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Bad request" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useDreamImage());

    await act(async () => {
      try {
        await result.current.generateImage({ random: true });
      } catch {}
    });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it("sets error when fetch rejects before a response exists", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useDreamImage());

    let thrownMessage = "";
    await act(async () => {
      try {
        await result.current.generateImage({ random: true });
      } catch (error) {
        thrownMessage = error instanceof Error ? error.message : String(error);
      }
    });

    await waitFor(() => {
      expect(thrownMessage).toMatch(/failed to fetch/i);
      expect(result.current.error).toBe("Failed to fetch");
      expect(result.current.isGeneratingImage).toBe(false);
    });
  });
});
