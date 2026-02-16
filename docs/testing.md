# Testing

This repo uses **Vitest** for both unit and integration tests.

## Commands

- `npm run test`: run all tests once
- `npm run test:watch`: watch mode
- `npm run test:ui`: Vitest UI runner
- `npm run test:coverage`: run with coverage
- `npm run test:e2e`: run Playwright browser E2E tests
- `npm run test:e2e:headed`: run Playwright E2E tests with visible browser
- `npm run test:e2e:ui`: run Playwright UI mode

## File Naming

- Unit tests: `*.test.ts` / `*.test.tsx` (`unit` Vitest project, `jsdom` environment)
- Integration tests: `*.int.test.ts` / `*.int.test.tsx` (`integration` Vitest project, `node` environment)
- Browser E2E tests: `e2e/**/*.spec.ts` (Playwright, Chromium project)

The environments are selected via `test.projects` in `vitest.config.ts`.

## Notes (Next.js)

- Some server-only modules import `"server-only"` (Next build-time directive). Vitest runs in Node and needs a real module, so `vitest.config.ts` aliases `"server-only"` to a local stub: `src/test/stubs/server-only.ts`.
- Route handler integration tests can import `POST`/`GET` directly from `src/app/api/**/route.ts` and call them with a standard `Request`.
- For route handlers that call external APIs, use **MSW** in `*.int.test.ts` to intercept upstream HTTP and return deterministic responses (no real API keys or network calls).
- `src/test/setup.ts` enables React 19 `act()` support globally and registers `jest-dom` assertions in `jsdom` tests.
- Browser-audio hooks (`useDreamAudio`, `useSpatialAudio`) should mock `Audio`, `AudioContext`, `PannerNode`, and `URL.createObjectURL` so behavior is deterministic in test runs.
- E2E tests must mock `/api/generate-image`, `/api/analyze-scene`, `/api/generate-voice`, and `/api/generate-sfx` route responses to avoid real OpenRouter/ElevenLabs usage and API credit spend.
- `playwright.config.ts` is configured for the locally installed Chrome channel (`channel: "chrome"`), so no Playwright browser download is required for local runs.
