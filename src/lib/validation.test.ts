import { describe, expect, it } from "vitest";

import {
  clamp,
  isRecord,
  readBoolean,
  readNonEmptyString,
  readNumber,
  readOptionalBoolean,
  readOptionalNumber,
  readOptionalString,
} from "@/lib/validation";

describe("validation", () => {
  it("isRecord", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord("nope")).toBe(false);
  });

  it("clamp", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(999, 0, 10)).toBe(10);
  });

  it("readNonEmptyString", () => {
    expect(readNonEmptyString("  hi  ", "text")).toBe("hi");
    expect(() => readNonEmptyString("", "text")).toThrow(/text must be a non-empty string/i);
    expect(() => readNonEmptyString(123, "text")).toThrow(/text must be a non-empty string/i);
  });

  it("readOptionalString", () => {
    expect(readOptionalString(undefined)).toBeNull();
    expect(readOptionalString("   ")).toBeNull();
    expect(readOptionalString(" ok ")).toBe("ok");
  });

  it("readBoolean + readOptionalBoolean", () => {
    expect(readBoolean(true, "flag")).toBe(true);
    expect(() => readBoolean("true", "flag")).toThrow(/flag must be a boolean/i);
    expect(readOptionalBoolean(undefined, "flag")).toBeUndefined();
  });

  it("readNumber + readOptionalNumber", () => {
    expect(readNumber(1.25, "n")).toBe(1.25);
    expect(() => readNumber(Number.NaN, "n")).toThrow(/n must be a finite number/i);
    expect(readOptionalNumber(undefined, "n")).toBeUndefined();
    expect(readOptionalNumber(null, "n")).toBeUndefined();
  });
});
