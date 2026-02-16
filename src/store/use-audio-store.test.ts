import { beforeEach, describe, expect, it } from "vitest";

import { useAudioStore } from "@/store/use-audio-store";
import type { DreamAudioAssets } from "@/types/dream";

const SAMPLE_AUDIO: DreamAudioAssets = {
  narrator: {
    blobUrl: "blob:narrator",
    text: "narration",
  },
  sfx: [
    {
      blobUrl: "blob:sfx-1",
      cue: {
        id: "river",
        prompt: "river",
        loop: true,
        volume: 0.8,
        start_sec: 0,
        end_sec: 12,
        position_start: { x: -4, y: 0, z: -2 },
        position_end: { x: -2, y: 0, z: -1 },
      },
    },
  ],
  timeline: {
    total_duration_sec: 60,
    cues: [
      {
        id: "river",
        prompt: "river",
        loop: true,
        volume: 0.8,
        start_sec: 0,
        end_sec: 12,
        position_start: { x: -4, y: 0, z: -2 },
        position_end: { x: -2, y: 0, z: -1 },
      },
    ],
  },
};

describe("useAudioStore", () => {
  beforeEach(() => {
    useAudioStore.setState({
      isPlaying: false,
      preparedAudio: null,
    });
  });

  it("updates isPlaying", () => {
    useAudioStore.getState().setIsPlaying(true);
    expect(useAudioStore.getState().isPlaying).toBe(true);
  });

  it("sets and clears preparedAudio", () => {
    useAudioStore.getState().setPreparedAudio(SAMPLE_AUDIO);
    expect(useAudioStore.getState().preparedAudio).toEqual(SAMPLE_AUDIO);

    useAudioStore.getState().setPreparedAudio(null);
    expect(useAudioStore.getState().preparedAudio).toBeNull();
  });
});

