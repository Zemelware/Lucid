import { create } from "zustand";

import type { DreamAudioAssets } from "@/types/dream";

type AudioStore = {
  isPlaying: boolean;
  preparedAudio: DreamAudioAssets | null;
  setIsPlaying: (next: boolean) => void;
  setPreparedAudio: (next: DreamAudioAssets | null) => void;
};

export const useAudioStore = create<AudioStore>((set) => ({
  isPlaying: false,
  preparedAudio: null,
  setIsPlaying: (next) => set({ isPlaying: next }),
  setPreparedAudio: (next) => set({ preparedAudio: next })
}));
