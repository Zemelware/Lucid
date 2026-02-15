# State (Zustand)

Lucid uses Zustand for a small set of app-wide state.

## Audio Store

File: `src/store/use-audio-store.ts`

Holds:

- `preparedAudio`: `DreamAudioAssets | null`
- `isPlaying`: boolean

Used by:

- `src/hooks/useDreamAudio.ts` to publish prepared assets
- `src/components/dream-canvas/dream-canvas.tsx` to coordinate play/pause UI

## Settings Store

File: `src/store/use-settings-store.ts`

Holds:

- `isHighRes`: whether image generation uses the high-res model
- `sfxVolume`: master SFX gain (0..3 in the UI)
- `sfxCueVolumes`: per-cue gain multipliers

Key behavior:

- `syncSfxCueVolumes(cueIds)` keeps the per-cue map aligned with the current timeline cue set.
- `clearSfxCueVolumes()` clears per-cue overrides.

