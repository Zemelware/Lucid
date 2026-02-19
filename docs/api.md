# API Routes

All routes live under `src/app/api/*/route.ts` and run in the Node.js runtime.

## CORS

All API routes support:

- `OPTIONS` preflight requests (`204 No Content`)
- CORS response headers for approved origins

Allowed origins include:

- `capacitor://localhost`
- `http://localhost`
- `https://localhost`
- `http://127.0.0.1`
- `https://127.0.0.1`
- `NEXT_PUBLIC_APP_URL` origin (if configured)

## POST /api/analyze-scene

File: `src/app/api/analyze-scene/route.ts`

Purpose:
- Sends the image (URL or data URL) to OpenRouter (Gemini) to produce:
  - A hypnotic second-person narrative
  - A timeline containing 2-5 SFX cues, each with timing, fades, volume, and 3D start/end positions

Request body (one of):
```json
{ "imageUrl": "https://..." }
```
```json
{ "imageDataUrl": "data:image/png;base64,..." }
```

Response body (DreamSceneAnalysis):
```json
{
  "narrative": "string",
  "timeline": {
    "total_duration_sec": 60,
    "cues": [
      {
        "id": "string",
        "prompt": "string",
        "loop": true,
        "volume": 0.6,
        "start_sec": 0,
        "end_sec": 20,
        "fade_in_sec": 2,
        "fade_out_sec": 2,
        "position_start": { "x": -4, "y": 0, "z": 2 },
        "position_end": { "x": 3, "y": 0, "z": -1 }
      }
    ]
  }
}
```

Behavior notes:
- Uses OpenRouter `responseFormat: { type: "json_schema", strict: true }` plus a local parse/normalize pass.
- Coordinates are clamped to [-10, 10].
- Cue timing is clamped to the timeline duration, and a minimum cue duration is enforced.
- Retries up to 3 times if the model returns invalid JSON/schema.

## POST /api/generate-voice

File: `src/app/api/generate-voice/route.ts`

Purpose:
- Converts narration text to speech via ElevenLabs.

Request body:
```json
{ "text": "Narration text...", "clientPlatform": "web" }
```

Response:
- `audio/mpeg` stream (MP3)
- `Cache-Control: no-store`

Implementation notes:
- Voice id, model id, and voice settings are fixed in the route.
- `clientPlatform` is optional (`"web"` default, `"mobile"` supported).
- Output format is platform-tuned:
  - Web: `mp3_44100_128`
  - Mobile: `mp3_44100_192`

## POST /api/generate-sfx

File: `src/app/api/generate-sfx/route.ts`

Purpose:
- Generates a sound effect from a text prompt via ElevenLabs.

Request body:
```json
{
  "text": "soft river wash, close left ear, looping",
  "loop": true,
  "durationSeconds": 12,
  "promptInfluence": 0.35,
  "clientPlatform": "web"
}
```

Response:
- `audio/mpeg` stream (MP3)
- `Cache-Control: no-store`

Implementation notes:
- `durationSeconds` is clamped to [0.5, 30].
- `promptInfluence` is clamped to [0, 1].
- `clientPlatform` is optional (`"web"` default, `"mobile"` supported).
- Output format is platform-tuned:
  - Web: `mp3_44100_128`
  - Mobile: `mp3_44100_96`

## POST /api/generate-image

File: `src/app/api/generate-image/route.ts`

Purpose:
- Generates a single dream scene image via OpenRouter.

Request body:
```json
{ "prompt": "a liminal observatory above clouds", "random": false, "isHighRes": false }
```
or
```json
{ "random": true, "isHighRes": true }
```

Response body:
```json
{ "imageUrl": "https://...", "imageDataUrl": null }
```
or
```json
{ "imageUrl": null, "imageDataUrl": "data:image/png;base64,..." }
```

Behavior notes:
- Attempts to extract an image from the model response by scanning message content for:
  - `data:image/*;base64,...`
  - `http(s)://...`
- Uses different models based on `isHighRes`.
