import { render, screen } from "@testing-library/react";
import type { HTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";

import { WelcomeHero } from "@/components/dream-canvas/welcome-hero";

vi.mock("framer-motion", () => ({
  motion: {
    h1: ({ children, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
      <h1 {...props}>{children}</h1>
    ),
    p: ({ children, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
      <p {...props}>{children}</p>
    ),
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: HTMLAttributes<HTMLSpanElement>) => (
      <span {...props}>{children}</span>
    ),
  },
}));

describe("WelcomeHero", () => {
  it("renders heading and one of the curated taglines", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.6);
    render(<WelcomeHero />);

    expect(screen.getByRole("heading", { name: "Lucid" })).toBeInTheDocument();
    expect(
      screen.getByText("Your dreams, rendered in sound.", {
        exact: false,
      }),
    ).toBeInTheDocument();
  });
});
