# Mobile (Capacitor)

Lucid mobile uses Capacitor as a native shell around a static Next.js export.

## Architecture

- Web UI is exported to static files (`webDir: .next-build`) and bundled into native apps.
- AI generation remains on a hosted backend (`/api/*` routes from the Next server deploy).
- Client hooks build API URLs with `src/lib/runtime-api.ts`.

This keeps API keys server-side and avoids shipping provider credentials in the app.

For local development, live reload is also supported so the native app shell can load your running Next dev server.

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

## Live Reload (Development)

Use two terminals:

1. Start the Next dev server for mobile:
   - `npm run mobile:dev`
2. Run the native app with Capacitor live reload:
   - iOS Simulator: `npm run mobile:ios:live`
   - Android Emulator: `npm run mobile:android:live`

Notes:

- `mobile:ios:live` targets `localhost:3000`, which works for iOS Simulator.
- `mobile:android:live` targets `10.0.2.2:3000`, which maps Android Emulator traffic to your host machine.
- Live scripts use `--no-sync` so they do not require static export artifacts during dev.
- `mobile:ios:live` clears `ios/DerivedData` before launching to avoid stale Xcode explicit-module cache failures.
- Run `npm run mobile:cap:sync:ios` once before first iOS live run (or after plugin/native config changes).
- Run `npm run mobile:cap:sync:android` once before first Android live run (or after plugin/native config changes).
- For physical devices, run `npx cap run <platform> --live-reload --host=<your-lan-ip> --port=3000`.
- Live reload is for web-layer changes (React/TS/CSS). Native changes still require native rebuilds/sync.

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
