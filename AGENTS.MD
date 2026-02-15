# Repository Guidelines

## Project Description

**Lucid** is an intelligent **8D Audio ASMR Dreamscape Generator**. It transforms any static image—whether a photo from your camera roll or an AI-generated scene—into a lucid, audio-visual dream.

Crucially, Lucid creates a **physically distinct 3D soundstage**. It doesn't just play stereo audio.
* If Gemini sees a river on the **left**, the user hears the water rushing *only* in their left ear.  
* If there is a fireplace **behind** the viewer in the image, the crackling sound comes from behind their head.  
* The narrator's voice feels intimate, close to the center, while the world expands around the user's periphery.

## Project Structure & Module Organization

Lucid is a Next.js (App Router) app. Most code lives in `src/` and is split by responsibility:

- `src/app/`: App Router pages/layout/styles plus server API routes under `src/app/api/**` (scene analysis, image generation, voice, SFX).
- `src/components/`: UI components (DreamCanvas orchestration + controls).
- `src/hooks/`: Client-side “engine” hooks for analysis, asset generation, and spatial playback (Web Audio).
- `src/store/`: Zustand stores for app-wide state (playback + user settings).
- `src/types/`: Shared TypeScript data contracts between API routes and client code.
- `src/lib/`: Shared utilities + provider clients (OpenRouter, ElevenLabs, fetch helpers, validation/normalization).

Supporting folders:
- `docs/`: system docs; update alongside behavior/contract changes.
- `public/`: static assets (most media is generated at runtime).

Conventions:
- Import alias: `@/*` maps to `src/*` (see `tsconfig.json`).
- Types in `src/types/` are the API/client boundary; keep them in sync with `docs/types.md` when changed.

## Build, Test, and Development Commands

- Node version: `22` (see `.nvmrc`; `package.json` engines is `>=20 <23`).
- Install deps: `npm ci` (CI) or `npm install` (local).
- Dev server: `npm run dev` (Next dev server).
- Production build: `npm run build` (runs `npm run clean` first).
- Start production server: `npm run start` (requires a prior build).
- Lint: `npm run lint`
- Typecheck: `npm run typecheck` (includes `next typegen`)
- Clean build artifacts: `npm run clean` (removes `.next` and `.next-build`)

Notes:
- No dedicated unit/integration test runner is configured yet; use `lint` + `typecheck` as the baseline verification.

## Documentation
- All high-level documentation lives in the `docs/` folder.
- When you introduce a new subsystem, feature, or non-trivial script, create or update a doc in `docs/`.
- When you modify behavior, APIs, or data models, you **must** check if there are any docs relevant to the change and update the relevant doc in the same change.
- Use this documentation as context before making any significant changes.
- When adding/updating documentation, ensure that you provide the right amount of context such that an agent could easily add new changes after reading the doc.

## Code Style
- Keep code clean and well-organized.
- Write modular code with clear separation of concerns.
- Follow DRY (Don't Repeat Yourself) principles.
- Use meaningful and self-documenting variable and function names.
- Add brief comments where necessary to explain complex logic.
- Follow best practices of the language/framework being used.
- Aim to keep files under ~600 LOC; guideline only (not a hard guardrail). Split/refactor when it improves clarity or testability.

## Agent-Specific Notes
- When answering questions, respond with high-confidence answers only: verify in code; do not guess.
- Assume other agents may be working; keep unrelated WIP untouched and avoid cross-cutting state changes.
