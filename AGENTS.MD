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
- Tests: `npm run test` (Vitest)
- Test watch mode: `npm run test:watch`
- Test coverage report: `npm run test:coverage`
- Browser E2E tests: `npm run test:e2e` (Playwright)
- Clean build artifacts: `npm run clean` (removes `.next` and `.next-build`)

Notes:
- For significant code changes, run the relevant test suite(s) before finishing (`npm run test` at minimum, plus lint/typecheck when applicable).
- When adding or changing features, add new tests or update existing tests in the same change so behavior is verified and regressions are caught.
- Tests are split into:
  - Unit tests: `*.test.ts` / `*.test.tsx` (`unit` Vitest project, `jsdom`)
  - Integration tests: `*.int.test.ts` / `*.int.test.tsx` (`integration` Vitest project, `node`; call `GET`/`POST` route handlers directly with `Request`)
- Browser E2E tests: `e2e/**/*.spec.ts` (Playwright).
- Use MSW in integration tests to mock external HTTP (OpenRouter/ElevenLabs) so tests are deterministic and do not require real keys.
- E2E tests should mock `/api/*` responses and block provider domains, so browser-flow tests never spend real API credits.
- Playwright E2E runs against local Chrome (`playwright.config.ts` uses `channel: "chrome"`).
- E2E projects run in both desktop and mobile Chrome profiles; keep critical user flows green in both.
- Next’s `"server-only"` import is stubbed in Vitest via `vitest.config.ts` aliasing to `src/test/stubs/server-only.ts`.
- React hook tests use `renderHook` from Testing Library and rely on `src/test/setup.ts` setting `IS_REACT_ACT_ENVIRONMENT = true`.
- Client audio tests should mock browser APIs (`Audio`, `AudioContext`, `PannerNode`, `URL.createObjectURL`) to keep tests deterministic in `jsdom`.
- Current baseline coverage includes API routes (`analyze-scene`, `generate-image`, `generate-sfx`, `generate-voice`), hooks, stores, and key DreamCanvas controls/orchestration behavior.

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
