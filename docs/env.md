# Environment And Configuration

## Required Environment Variables

Configured via `.env.local` (not committed):

- `OPENROUTER_API_KEY`
- `ELEVENLABS_API_KEY`

## Optional Environment Variables

- `NEXT_PUBLIC_APP_URL`
  - Used as OpenRouter `httpReferer` in `src/lib/openrouter.ts`.
  - Defaults to `http://localhost:3000` if unset.
  - Its origin is also included in API route CORS allowlist (`src/lib/cors.ts`).
- `NEXT_PUBLIC_API_BASE_URL`
  - Used by client hooks through `src/lib/runtime-api.ts` to build API URLs.
  - When unset, requests use same-origin relative paths (for regular Next web deploys).
  - Set this for Capacitor builds (for example: `https://api.example.com`) so mobile
    web assets can call a hosted API backend.

## Runtime Notes

- API routes run with `runtime = "nodejs"` and use server-only modules (`src/lib/openrouter.ts`, `src/lib/elevenlabs.ts`).
- Browser features required for playback:
  - Web Audio API (AudioContext, PannerNode with `panningModel: "HRTF"`)
  - Autoplay restrictions: user gesture required before resuming AudioContext (handled in `useSpatialAudio` by calling `context.resume()` on play).
- Capacitor mobile builds are static exports served from the native shell (`webDir: .next-build`) and
  do not execute local Next API routes inside the app bundle.
