# AI (OpenRouter)

OpenRouter is used for:

- Multimodal scene analysis: narrative + spatial timeline cues
- Image generation (separate endpoint; see `docs/image.md`)

## OpenRouter Client

File: `src/lib/openrouter.ts`

- Reads `OPENROUTER_API_KEY`.
- Sets `httpReferer` to `NEXT_PUBLIC_APP_URL` (or `http://localhost:3000`).
- Reuses a global singleton client (per Node process) via `globalThis.__lucidOpenRouter`.

## Scene Analysis (Gemini)

Route: `src/app/api/analyze-scene/route.ts`

- Model: `google/gemini-3-flash-preview` (see `MODEL_NAME` in the route)
- Input: user-provided image (data URL or http(s) URL)
- Output: strict JSON, validated by a JSON schema and parsed into `DreamSceneAnalysis`

### Output Shape

Source of truth for types: `src/types/dream.ts`

- `DreamSceneAnalysis`
- `DreamTimeline`
- `TimelineSfxCue`
- `Position3D`

### Contract Notes

- Coordinates: clamped to [-10, 10] on x/y/z.
- Timeline duration: clamped to [20, 180] seconds.
- Cue count: 2 to 5.
- Cue windows are normalized to ensure a minimum duration and to fit within the timeline.

### Prompting Notes

The route combines:

- A system prompt setting role ("Dream Director")
- A user prompt describing the desired JSON structure and constraints
- A strict JSON schema response format to reduce malformed output

If you change:

- The narrative length constraints
- Cue count constraints
- Any cue fields

Update:

- `src/app/api/analyze-scene/route.ts` (prompt + schema + parser)
- `src/types/dream.ts` (types)
- `docs/api.md` + `docs/types.md`

