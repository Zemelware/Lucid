import { create } from "zustand";

type AudioStore = {
  isPlaying: boolean;
  setIsPlaying: (next: boolean) => void;
};

export const useAudioStore = create<AudioStore>((set) => ({
  isPlaying: false,
  setIsPlaying: (next) => set({ isPlaying: next })
}));
