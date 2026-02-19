# Mobile (Capacitor)

Lucid mobile uses Capacitor as a native shell around a static Next.js export.

## Architecture

- Web UI is exported to static files (`webDir: .next-build`) and bundled into native apps.
- AI generation remains on a hosted backend (`/api/*` routes from the Next server deploy).
- Client hooks build API URLs with `src/lib/runtime-api.ts`.

This keeps API keys server-side and avoids shipping provider credentials in the app.

## Requirements

- Capacitor packages in `package.json`:
  - `@capacitor/core`
  - `@capacitor/cli`
  - `@capacitor/ios`
  - `@capacitor/android`
- Hosted HTTPS backend for Lucid API routes.
- `NEXT_PUBLIC_API_BASE_URL` set for mobile builds.

## Configuration

Capacitor config lives at `capacitor.config.ts`:

- `appId: "com.lucid.dreamscape"`
- `appName: "Lucid"`
- `webDir: ".next-build"`

## Setup

1. Install dependencies.
2. Add native projects:
   - `npm run mobile:ios:add`
   - `npm run mobile:android:add`
3. Build and sync:
   - `npm run mobile:cap:sync:android`
   - `npm run mobile:cap:sync:ios`
4. Open native IDE projects:
   - `npm run mobile:ios`
   - `npm run mobile:android`

## Backend And CORS

Your hosted API must allow requests from Capacitor app origins:

- `capacitor://localhost` (iOS)
- `http://localhost` or `https://localhost` (Android, based on scheme)

Use HTTPS for backend endpoints in production.

## Notes

- Mobile static builds use `NEXT_EXPORT_MODE=1` in `next.config.ts`.
- Mobile sync flows should run from a clean state (`.next`, `.next-build`, and `.next-dev` removed) because stale Next trace artifacts can break export with missing `*.nft.json` file errors.
- Dev uses an isolated Next dist directory (`.next-dev`), while mobile export uses `.next-build`, to reduce cross-workflow artifact collisions.
- In mobile export mode, Next build-time lint/type validation is skipped to avoid local type-manifest collisions during concurrent local workflows.
- In mobile export mode, `pageExtensions` is constrained to `tsx/jsx/js` so App Router API handlers (`src/app/api/**/route.ts`) are excluded from export route discovery while keeping Next internal JS pages (like `/_document`) resolvable.
- In export mode, app API route handlers are excluded from route discovery and are not bundled into the mobile web build.
- Audio playback still requires a user gesture before autoplay-resume behavior can proceed.
- iOS sync depends on a working CocoaPods environment (`pod install` must succeed).
