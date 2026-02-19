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
- Sends `clientPlatform` with each audio request (`"web"` or `"mobile"`). The API routes can pick mobile-specific output formats without changing web output.
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
  - Blob URL is decoded to `AudioBuffer` once during graph setup
  - Runtime chain per cue: `AudioBufferSourceNode` -> `PannerNode(HRTF)` -> `GainNode` -> `SFX master GainNode` -> `destination`

Timeline sync:

- Narrator element time is the master clock.
- On Play, SFX elements are briefly started muted and paused in the same user gesture to satisfy mobile autoplay rules before cue-based scheduling begins.
- On Play/Seek, cue sources are scheduled from the shared `AudioContext` clock instead of repeatedly mutating `HTMLAudioElement` playback state.
- Each animation frame:
  - Compute timeline time relative to narrator progress
  - For each cue:
    - Compute an envelope (fade in/out) based on `fade_in_sec` / `fade_out_sec`
    - Interpolate `position_start` -> `position_end` for panner position
    - Apply cue gain = `cue.volume * userCueBoost * envelope`
    - Start each cue source once when entering its window and stop it once after it exits (with a tiny end grace) to avoid rapid start/stop churn on mobile
  - Narrator remains the single transport clock; looped cues receive occasional re-sync if drift exceeds a threshold

Coordinate convention:

- Scene convention in the model is "z < 0 is behind".
- Web Audio uses positive Z forward, so the implementation inverts Z for the panner (`positionZ = -sceneZ`).

User mixing:

- Master SFX volume: `useSettingsStore().sfxVolume`
- Per-cue volume boost: `useSettingsStore().sfxCueVolumes[cue.id]`
- Master volume uses `setTargetAtTime` smoothing.

Loop behavior:

- SFX elements now respect per-cue loop flags from analysis (`cue.loop`) instead of forcing all tracks to loop.

## Extension Points

- If you add more cue types (one-shots vs loops, delays, etc.), define the behavior in:
  - `src/types/dream.ts`
  - `src/hooks/useSpatialAudio.ts` (graph + timeline)
  - `src/components/dream-canvas/dream-canvas.tsx` (UI controls)
- Dev-only snapshot loading rehydrates audio through `useDreamAudio` using saved narrator/SFX blobs,
  then reuses the same `DreamAudioAssets` + `useSpatialAudio` path as first-run generations.
  - Snapshot modules live under `src/devtools/dreamscape-snapshots/**` and are gated by
    `NEXT_PUBLIC_ENABLE_DEV_DREAMSCAPE_SNAPSHOTS`.
