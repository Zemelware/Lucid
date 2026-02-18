import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApiUrl } from "@/lib/runtime-api";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("buildApiUrl", () => {
  it("returns a relative path when NEXT_PUBLIC_API_BASE_URL is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");

    expect(buildApiUrl("/api/analyze-scene")).toBe("/api/analyze-scene");
  });

  it("prepends NEXT_PUBLIC_API_BASE_URL and trims trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.lucid.example.com/");

    expect(buildApiUrl("/api/generate-image")).toBe(
      "https://api.lucid.example.com/api/generate-image",
    );
  });

  it("throws when the path is not absolute", () => {
    expect(() => buildApiUrl("api/generate-image")).toThrow(/must start with "\/"/i);
  });
});
