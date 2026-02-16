import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { HTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DreamCanvas } from "@/components/dream-canvas/dream-canvas";
import { useAudioStore } from "@/store/use-audio-store";
import { useSettingsStore } from "@/store/use-settings-store";
import type { DreamSceneAnalysis } from "@/types/dream";

const mockAnalyzeScene = vi.fn();
const mockGenerateImage = vi.fn();
const mockPrepareAudio = vi.fn();
const mockClearPreparedAudio = vi.fn();
const mockStopSpatialAudio = vi.fn();
const mockPauseSpatialAudio = vi.fn();
const mockPlaySpatialAudio = vi.fn();
const mockSeekSpatialAudio = vi.fn();
const mockClearAnalysis = vi.fn();
const mockClearImageError = vi.fn();

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, src }: { alt: string; src: string }) => (
    <div role="img" aria-label={alt} data-src={src} />
  ),
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    h1: ({ children, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
      <h1 {...props}>{children}</h1>
    ),
    p: ({ children, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
      <p {...props}>{children}</p>
    ),
    span: ({ children, ...props }: HTMLAttributes<HTMLSpanElement>) => (
      <span {...props}>{children}</span>
    ),
  },
}));

vi.mock("@/hooks/usePanelTone", () => ({
  usePanelTone: () => "light",
}));

vi.mock("@/hooks/useSceneAnalysis", () => ({
  useSceneAnalysis: () => ({
    isAnalyzing: false,
    error: null,
    analyzeScene: mockAnalyzeScene,
    clearAnalysis: mockClearAnalysis,
  }),
}));

vi.mock("@/hooks/useDreamImage", () => ({
  useDreamImage: () => ({
    isGeneratingImage: false,
    error: null,
    generateImage: mockGenerateImage,
    clearError: mockClearImageError,
  }),
}));

vi.mock("@/hooks/useDreamAudio", () => ({
  useDreamAudio: () => ({
    isPreparingAudio: false,
    error: null,
    prepareAudio: mockPrepareAudio,
    clearPreparedAudio: mockClearPreparedAudio,
  }),
}));

vi.mock("@/hooks/useSpatialAudio", () => ({
  useSpatialAudio: () => ({
    play: mockPlaySpatialAudio,
    pause: mockPauseSpatialAudio,
    stop: mockStopSpatialAudio,
    seek: mockSeekSpatialAudio,
    currentTimeSeconds: 0,
    durationSeconds: 0,
    error: null,
  }),
}));

const SAMPLE_ANALYSIS: DreamSceneAnalysis = {
  narrative: "you drift through quiet reflections while wind and water pass behind you.",
  timeline: {
    total_duration_sec: 60,
    cues: [
      {
        id: "rain",
        prompt: "rain",
        loop: true,
        volume: 0.8,
        start_sec: 0,
        end_sec: 22,
        position_start: { x: -4, y: 0, z: -2 },
        position_end: { x: -2, y: 0, z: -1 },
      },
      {
        id: "wind",
        prompt: "wind",
        loop: false,
        volume: 0.5,
        start_sec: 18,
        end_sec: 34,
        position_start: { x: 2, y: 0, z: 2 },
        position_end: { x: 5, y: 0, z: 3 },
      },
    ],
  },
};

beforeEach(() => {
  useAudioStore.setState({ isPlaying: false, preparedAudio: null });
  useSettingsStore.setState({ isHighRes: false, sfxVolume: 1, sfxCueVolumes: {} });

  mockAnalyzeScene.mockReset();
  mockGenerateImage.mockReset();
  mockPrepareAudio.mockReset();
  mockClearPreparedAudio.mockReset();
  mockStopSpatialAudio.mockReset();
  mockPauseSpatialAudio.mockReset();
  mockPlaySpatialAudio.mockReset();
  mockSeekSpatialAudio.mockReset();
  mockClearAnalysis.mockReset();
  mockClearImageError.mockReset();

  mockGenerateImage.mockResolvedValue({
    imageUrl: null,
    imageDataUrl: "data:image/png;base64,AAA",
  });
  mockAnalyzeScene.mockResolvedValue(SAMPLE_ANALYSIS);
  mockPrepareAudio.mockResolvedValue(null);
});

describe("DreamCanvas", () => {
  it("disables Dream button until an image exists", () => {
    render(<DreamCanvas />);

    const dreamButton = screen.getByRole("button", { name: /^dream$/i });
    expect(dreamButton).toBeDisabled();

    expect(mockAnalyzeScene).not.toHaveBeenCalled();
    expect(mockPrepareAudio).not.toHaveBeenCalled();
  });

  it("creates a scene from prompt and then runs dream analysis/audio prep", async () => {
    render(<DreamCanvas />);

    fireEvent.change(screen.getByPlaceholderText(/describe a dream scene/i), {
      target: { value: "Moonlit observatory above clouds" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create scene/i }));

    await waitFor(() => {
      expect(mockGenerateImage).toHaveBeenCalledWith({
        prompt: "Moonlit observatory above clouds",
        random: false,
        isHighRes: false,
      });
    });

    fireEvent.click(screen.getByRole("button", { name: /^dream$/i }));

    await waitFor(() => {
      expect(mockAnalyzeScene).toHaveBeenCalledWith({
        imageDataUrl: "data:image/png;base64,AAA",
      });
      expect(mockPrepareAudio).toHaveBeenCalledWith(SAMPLE_ANALYSIS);
    });
  });

  it("triggers random scene generation via dice button", async () => {
    render(<DreamCanvas />);

    fireEvent.click(screen.getByRole("button", { name: /create random scene/i }));

    await waitFor(() => {
      expect(mockGenerateImage).toHaveBeenCalledWith({
        random: true,
        isHighRes: false,
      });
    });
  });
});
