import { afterEach } from "vitest";

// Required for React 19 act() behavior in tests.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Only register DOM-specific helpers for jsdom tests.
if (typeof document !== "undefined") {
  await import("@testing-library/jest-dom/vitest");

  const { cleanup } = await import("@testing-library/react");
  afterEach(() => cleanup());
}
