# Environment And Configuration

## Required Environment Variables

Configured via `.env.local` (not committed):

- `OPENROUTER_API_KEY`
- `ELEVENLABS_API_KEY`

## Optional Environment Variables

- `NEXT_PUBLIC_APP_URL`
  - Used as OpenRouter `httpReferer` in `src/lib/openrouter.ts`.
  - Defaults to `http://localhost:3000` if unset.

## Runtime Notes

- API routes run with `runtime = "nodejs"` and use server-only modules (`src/lib/openrouter.ts`, `src/lib/elevenlabs.ts`).
- Browser features required for playback:
  - Web Audio API (AudioContext, PannerNode with `panningModel: "HRTF"`)
  - Autoplay restrictions: user gesture required before resuming AudioContext (handled in `useSpatialAudio` by calling `context.resume()` on play).

