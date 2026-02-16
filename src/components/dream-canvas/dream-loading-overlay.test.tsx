import { render, screen } from "@testing-library/react";
import type { HTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { DreamLoadingOverlay } from "@/components/dream-canvas/dream-loading-overlay";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: HTMLAttributes<HTMLSpanElement>) => (
      <span {...props}>{children}</span>
    ),
    p: ({ children, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
      <p {...props}>{children}</p>
    ),
  },
}));

describe("DreamLoadingOverlay", () => {
  it("does not render while hidden", () => {
    render(<DreamLoadingOverlay isVisible={false} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders status and custom message while visible", () => {
    render(<DreamLoadingOverlay isVisible message="Weaving the soundscape..." />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Weaving the soundscape...")).toBeInTheDocument();
  });
});
