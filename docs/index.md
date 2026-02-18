# Lucid Docs

High-level documentation for Lucid. Any non-trivial subsystem, feature, or script should be documented somewhere under `docs/`.

## Where To Start

- Architecture overview: `docs/architecture.md`
- Environment + config: `docs/env.md`
- API routes (server): `docs/api.md`
- Capacitor mobile shell: `docs/mobile.md`
- AI scene analysis (Gemini via OpenRouter): `docs/ai.md`
- Image generation (Imagen via OpenRouter): `docs/image.md`
- Audio generation + playback (ElevenLabs + Web Audio): `docs/audio.md`
- UI composition: `docs/ui.md`
- State (Zustand stores): `docs/state.md`
- Data types / schemas: `docs/types.md`
- Non-trivial scripts (npm): `docs/scripts.md`

## Documentation Rule Of Thumb

If you add any of the following, add/update docs in this folder:

- A new API route under `src/app/api/**`
- A new hook under `src/hooks/**` with non-trivial behavior
- A new store under `src/store/**`
- Any audio graph changes (panner models, gain envelopes, sync logic)
- Any prompt/schema changes used with the model(s)
- A new npm script or a script with side effects (e.g. deletes/builds)
