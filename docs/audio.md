# Audio Generation And Playback

Lucid has two distinct steps:

1. Generate assets (narrator + SFX audio files)
2. Play them spatially in sync using Web Audio

## 1) Asset Generation (ElevenLabs)

Hook: `src/hooks/useDreamAudio.ts`  
Routes:
- `src/app/api/generate-voice/route.ts`
- `src/app/api/generate-sfx/route.ts`

Behavior:

- Starts narrator TTS and all SFX generations in parallel.
- Converts each response to a Blob URL (`URL.createObjectURL`).
- Preloads each Blob URL into an `HTMLAudioElement` (best-effort; resolves after 4s timeout).
- Stores the prepared bundle as `DreamAudioAssets` (also mirrored into Zustand via `useAudioStore`).
- Cleans up on unmount and on regeneration:
  - Aborts in-flight requests
  - Disposes audio elements
  - Revokes Blob URLs

SFX generation defaults (client-side):

- Loop cues: `durationSeconds: 12`, `promptInfluence: 0.35`
- Non-loop cues: `durationSeconds: 6`, `promptInfluence: 0.45`

## 2) Spatial Playback (Web Audio)

Hook: `src/hooks/useSpatialAudio.ts`

Graph overview:

- Narrator:
  - `HTMLAudioElement` -> `MediaElementAudioSourceNode` -> `GainNode` -> `destination`
  - No panner; stays centered/intimate via gain (~1.05).
- SFX:
  - `HTMLAudioElement` -> `MediaElementAudioSourceNode` -> `PannerNode(HRTF)` -> `GainNode` -> `SFX master GainNode` -> `destination`

Timeline sync:

- Narrator element time is the master clock.
- Each animation frame:
  - Compute timeline time relative to narrator progress
  - For each cue:
    - Compute an envelope (fade in/out) based on `fade_in_sec` / `fade_out_sec`
    - Interpolate `position_start` -> `position_end` for panner position
    - Apply cue gain = `cue.volume * userCueBoost * envelope`

Coordinate convention:

- Scene convention in the model is "z < 0 is behind".
- Web Audio uses positive Z forward, so the implementation inverts Z for the panner (`positionZ = -sceneZ`).

User mixing:

- Master SFX volume: `useSettingsStore().sfxVolume`
- Per-cue volume boost: `useSettingsStore().sfxCueVolumes[cue.id]`
- Master volume uses `setTargetAtTime` smoothing.

## Extension Points

- If you add more cue types (one-shots vs loops, delays, etc.), define the behavior in:
  - `src/types/dream.ts`
  - `src/hooks/useSpatialAudio.ts` (graph + timeline)
  - `src/components/dream-canvas/dream-canvas.tsx` (UI controls)

