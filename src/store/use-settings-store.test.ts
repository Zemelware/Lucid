import { beforeEach, describe, expect, it } from "vitest";

import { useSettingsStore } from "@/store/use-settings-store";

const RESET_STATE = {
  isHighRes: false,
  sfxVolume: 1,
  sfxCueVolumes: {},
};

describe("useSettingsStore", () => {
  beforeEach(() => {
    useSettingsStore.setState(RESET_STATE);
  });

  it("updates basic settings", () => {
    useSettingsStore.getState().setIsHighRes(true);
    useSettingsStore.getState().setSfxVolume(1.75);

    const state = useSettingsStore.getState();
    expect(state.isHighRes).toBe(true);
    expect(state.sfxVolume).toBe(1.75);
  });

  it("sets per-cue volume values", () => {
    useSettingsStore.getState().setSfxCueVolume("river_left", 0.4);
    useSettingsStore.getState().setSfxCueVolume("windFront", 1.5);

    expect(useSettingsStore.getState().sfxCueVolumes).toEqual({
      river_left: 0.4,
      windFront: 1.5,
    });
  });

  it("syncs cue volumes with defaults for missing cues and drops removed cues", () => {
    useSettingsStore.getState().setSfxCueVolume("river_left", 0.4);
    useSettingsStore.getState().setSfxCueVolume("old_cue", 1.2);

    useSettingsStore.getState().syncSfxCueVolumes(["river_left", "new_cue"]);

    expect(useSettingsStore.getState().sfxCueVolumes).toEqual({
      river_left: 0.4,
      new_cue: 1,
    });
  });

  it("clears cue volumes", () => {
    useSettingsStore.getState().setSfxCueVolume("river_left", 0.4);
    useSettingsStore.getState().clearSfxCueVolumes();

    expect(useSettingsStore.getState().sfxCueVolumes).toEqual({});
  });
});

