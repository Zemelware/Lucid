# Testing

This repo uses **Vitest** for both unit and integration tests.

## Commands

- `npm run test`: run all tests once
- `npm run test:watch`: watch mode
- `npm run test:ui`: Vitest UI runner
- `npm run test:coverage`: run with coverage

## File Naming

- Unit tests: `*.test.ts` / `*.test.tsx` (`unit` Vitest project, `jsdom` environment)
- Integration tests: `*.int.test.ts` / `*.int.test.tsx` (`integration` Vitest project, `node` environment)

The environments are selected via `test.projects` in `vitest.config.ts`.

## Notes (Next.js)

- Some server-only modules import `"server-only"` (Next build-time directive). Vitest runs in Node and needs a real module, so `vitest.config.ts` aliases `"server-only"` to a local stub: `src/test/stubs/server-only.ts`.
- Route handler integration tests can import `POST`/`GET` directly from `src/app/api/**/route.ts` and call them with a standard `Request`.
- For route handlers that call external APIs, use **MSW** in `*.int.test.ts` to intercept upstream HTTP and return deterministic responses (no real API keys or network calls).
- `src/test/setup.ts` enables React 19 `act()` support globally and registers `jest-dom` assertions in `jsdom` tests.
- Browser-audio hooks (`useDreamAudio`, `useSpatialAudio`) should mock `Audio`, `AudioContext`, `PannerNode`, and `URL.createObjectURL` so behavior is deterministic in test runs.
