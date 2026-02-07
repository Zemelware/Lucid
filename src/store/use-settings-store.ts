import { create } from "zustand";

type SettingsStore = {
  isHighRes: boolean;
  sfxVolume: number;
  sfxCueVolumes: Record<string, number>;
  setIsHighRes: (next: boolean) => void;
  setSfxVolume: (next: number) => void;
  setSfxCueVolume: (cueId: string, next: number) => void;
  syncSfxCueVolumes: (cueIds: string[]) => void;
  clearSfxCueVolumes: () => void;
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  isHighRes: false,
  sfxVolume: 1.0,
  sfxCueVolumes: {},
  setIsHighRes: (next) => set({ isHighRes: next }),
  setSfxVolume: (next) => set({ sfxVolume: next }),
  setSfxCueVolume: (cueId, next) =>
    set((state) => ({
      sfxCueVolumes: {
        ...state.sfxCueVolumes,
        [cueId]: next,
      },
    })),
  syncSfxCueVolumes: (cueIds) =>
    set((state) => {
      const nextCueVolumes: Record<string, number> = {};
      cueIds.forEach((cueId) => {
        nextCueVolumes[cueId] = state.sfxCueVolumes[cueId] ?? 1;
      });

      return { sfxCueVolumes: nextCueVolumes };
    }),
  clearSfxCueVolumes: () => set({ sfxCueVolumes: {} }),
}));
