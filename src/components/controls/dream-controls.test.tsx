import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { DreamControls } from "@/components/controls/dream-controls";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    p: ({ children, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
      <p {...props}>{children}</p>
    ),
  },
}));

function renderControls(overrides: Partial<ComponentProps<typeof DreamControls>> = {}) {
  const props: ComponentProps<typeof DreamControls> = {
    onUploadClick: vi.fn(),
    onCreateSceneClick: vi.fn(),
    onRandomSceneClick: vi.fn(),
    onScenePromptChange: vi.fn(),
    onDreamClick: vi.fn(),
    onPlayToggle: vi.fn(),
    onPlaybackSeek: vi.fn(),
    scenePrompt: "",
    isGeneratingScene: false,
    isDreaming: false,
    isPlaying: false,
    canCreateScene: true,
    canRandomScene: true,
    canDream: true,
    canPlayAudio: true,
    canSeekAudio: true,
    showPlaybackControls: true,
    playbackTimeSeconds: 12,
    playbackDurationSeconds: 72,
    panelTone: "light",
    dreamError: null,
    ...overrides,
  };

  render(<DreamControls {...props} />);
  return props;
}

describe("DreamControls", () => {
  it("wires prompt and action callbacks", () => {
    const props = renderControls();

    fireEvent.change(screen.getByPlaceholderText(/describe a dream scene/i), {
      target: { value: "Moonlit observatory" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create scene/i }));
    fireEvent.click(screen.getByRole("button", { name: /create random scene/i }));
    fireEvent.click(screen.getByRole("button", { name: /upload/i }));
    fireEvent.click(screen.getByRole("button", { name: /^dream$/i }));

    expect(props.onScenePromptChange).toHaveBeenCalledWith("Moonlit observatory");
    expect(props.onCreateSceneClick).toHaveBeenCalledTimes(1);
    expect(props.onRandomSceneClick).toHaveBeenCalledTimes(1);
    expect(props.onUploadClick).toHaveBeenCalledTimes(1);
    expect(props.onDreamClick).toHaveBeenCalledTimes(1);
  });

  it("seeks playback and toggles play/pause", () => {
    const props = renderControls({ isPlaying: true });

    fireEvent.click(screen.getByRole("button", { name: /pause dream audio/i }));
    fireEvent.change(screen.getByLabelText(/dream playback timeline/i), {
      target: { value: "22.5" },
    });

    expect(props.onPlayToggle).toHaveBeenCalledTimes(1);
    expect(props.onPlaybackSeek).toHaveBeenCalledWith(22.5);
  });

  it("collapses to audio-only mode", () => {
    renderControls();

    fireEvent.click(screen.getByRole("button", { name: /collapse controls/i }));

    expect(screen.queryByPlaceholderText(/describe a dream scene/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/dream playback timeline/i)).toBeInTheDocument();
  });

  it("shows dreamError when provided", () => {
    renderControls({ dreamError: "Playback failed." });
    expect(screen.getByText("Playback failed.")).toBeInTheDocument();
  });
});
