import { afterEach, describe, expect, it, vi } from "vitest";

import { createOptionsResponse, withCors } from "@/lib/cors";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("cors helpers", () => {
  it("applies CORS headers for allowed Capacitor origin", () => {
    const request = new Request("http://localhost/api/test", {
      headers: {
        origin: "capacitor://localhost",
      },
    });
    const response = withCors(request, new Response("ok", { status: 200 }));

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("capacitor://localhost");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("OPTIONS");
  });

  it("allows NEXT_PUBLIC_APP_URL origin", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://lucid-alpha-seven.vercel.app");
    const request = new Request("http://localhost/api/test", {
      headers: {
        origin: "https://lucid-alpha-seven.vercel.app",
      },
    });
    const response = createOptionsResponse(request);

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://lucid-alpha-seven.vercel.app",
    );
  });

  it("omits allow-origin header for unapproved origin", () => {
    const request = new Request("http://localhost/api/test", {
      headers: {
        origin: "https://evil.example.com",
      },
    });
    const response = createOptionsResponse(request);

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
