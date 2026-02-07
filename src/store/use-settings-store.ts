import { create } from "zustand";

type SettingsStore = {
  isHighRes: boolean;
  setIsHighRes: (next: boolean) => void;
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  isHighRes: false,
  setIsHighRes: (next) => set({ isHighRes: next }),
}));
