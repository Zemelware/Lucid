# Types And Data Contracts

Source of truth: `src/types/dream.ts`

## DreamSceneAnalysis

Produced by:

- `POST /api/analyze-scene` (`src/app/api/analyze-scene/route.ts`)

Consumed by:

- `src/hooks/useDreamAudio.ts` (to generate narrator + SFX assets)
- `src/hooks/useSpatialAudio.ts` (to interpret timeline + positions)

```ts
export type DreamSceneAnalysis = {
  narrative: string;
  timeline: DreamTimeline;
};
```

## DreamTimeline And Cues

```ts
export type DreamTimeline = {
  total_duration_sec: number;
  cues: TimelineSfxCue[];
};

export type TimelineSfxCue = {
  id: string;
  prompt: string;
  loop: boolean;
  volume: number;
  start_sec: number;
  end_sec: number;
  fade_in_sec?: number;
  fade_out_sec?: number;
  position_start: Position3D;
  position_end: Position3D;
};
```

Position convention:

- `x`: left/right (-10..10)
- `y`: up/down (-10..10)
- `z`: front/back (-10..10) with "behind" represented as negative z in the model timeline

Note: Web Audio Z is inverted in `src/hooks/useSpatialAudio.ts` to match the scene convention.

## DreamAudioAssets

Produced by:

- `src/hooks/useDreamAudio.ts`

Consumed by:

- `src/hooks/useSpatialAudio.ts`

```ts
export type DreamAudioAssets = {
  narrator: { blobUrl: string; text: string };
  sfx: Array<{ blobUrl: string; cue: TimelineSfxCue }>;
  timeline: DreamTimeline;
};
```

