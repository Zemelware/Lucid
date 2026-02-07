import { create } from "zustand";

type SettingsStore = {
  isHighRes: boolean;
  sfxVolume: number;
  setIsHighRes: (next: boolean) => void;
  setSfxVolume: (next: number) => void;
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  isHighRes: false,
  sfxVolume: 1.0,
  setIsHighRes: (next) => set({ isHighRes: next }),
  setSfxVolume: (next) => set({ sfxVolume: next }),
}));
