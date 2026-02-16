import { describe, expect, it } from "vitest";

import { readApiErrorMessage } from "@/lib/api-client";

describe("readApiErrorMessage", () => {
  it("returns fallback for non-object values", () => {
    expect(readApiErrorMessage("nope", "fallback")).toBe("fallback");
    expect(readApiErrorMessage(null, "fallback")).toBe("fallback");
  });

  it("returns error message when payload has non-empty error string", () => {
    expect(readApiErrorMessage({ error: "Request failed." }, "fallback")).toBe("Request failed.");
    expect(readApiErrorMessage({ error: "  Detailed issue  " }, "fallback")).toBe(
      "  Detailed issue  ",
    );
  });

  it("falls back when error field exists but is empty/non-string", () => {
    expect(readApiErrorMessage({ error: "" }, "fallback")).toBe("fallback");
    expect(readApiErrorMessage({ error: "   " }, "fallback")).toBe("fallback");
    expect(readApiErrorMessage({ error: 123 }, "fallback")).toBe("fallback");
  });
});

