# UI (DreamCanvas / Controls)

Primary entry:

- `src/app/page.tsx` renders `DreamCanvas`.
- `src/components/dream-canvas/dream-canvas.tsx` orchestrates the entire user flow.
- `src/components/controls/dream-controls.tsx` is the control panel UI.

## DreamCanvas Responsibilities

File: `src/components/dream-canvas/dream-canvas.tsx`

- Image sources:
  - Upload: stores both an object URL (fast display) and a data URL (for `analyze-scene`).
  - Generated: stores either a data URL or URL from `generate-image`.
- State resets:
  - Changing the scene clears analysis and prepared audio, stops playback, and clears errors.
- "Dream" action:
  - Calls `useSceneAnalysis().analyzeScene(...)`
  - Then calls `useDreamAudio().prepareAudio(analysis)`
- Playback:
  - Delegates to `useSpatialAudio(preparedAudio)`
  - Maintains `isPlaying` in `useAudioStore`
- Mixing UI:
  - Master SFX volume + per-cue sliders
  - Persists volumes in `useSettingsStore`
- Panel tone:
  - Samples the active image on a small canvas to estimate average luminance.
  - Switches control styling between light/dark for contrast.

## Loading Overlay

File: `src/components/dream-canvas/dream-loading-overlay.tsx`

Shown whenever any of these are active:

- Scene generation
- Scene analysis
- Audio generation

## Welcome State

File: `src/components/dream-canvas/welcome-hero.tsx`

Rendered behind the controls when no image is selected.
