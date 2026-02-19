# Scripts (npm)

Scripts live in `package.json`. These are non-trivial because they affect build output, local state, and type generation.

## dev

Command:
- `npm run dev`

Runs Next dev server:
- `rm -rf .next-dev && NEXT_EXPORT_MODE=0 next dev`

`dev` uses an isolated build directory (`.next-dev`) so development artifacts cannot collide with mobile export artifacts.

## build

Command:
- `npm run build`

Behavior:

1. Runs `clean` (deletes build outputs)
2. Builds Next:
   - `NEXT_EXPORT_MODE=0 next build`

## start

Command:
- `npm run start`

Starts the production server:
- `NEXT_EXPORT_MODE=0 next start`

## mobile:web:build

Command:
- `npm run mobile:web:build`

Builds a static export intended for Capacitor:
- Runs `clean` (deletes `.next`, `.next-build`, and `.next-dev`)
- Sets `NEXT_EXPORT_MODE=1`
- Runs Next build

`NEXT_EXPORT_MODE=1` enables static export behavior in `next.config.ts`.

Because Next can read stale trace artifacts from `.next` during export flows, mobile builds intentionally do a full clean for deterministic output.

## mobile:dev

Command:
- `npm run mobile:dev`

Runs a Next dev server for Capacitor live reload:
- `rm -rf .next-dev && NEXT_EXPORT_MODE=0 next dev --hostname 0.0.0.0 --port 3000`

This binds to all interfaces so native emulators/devices can reach your local server.

## mobile:cap:sync

Command:
- `npm run mobile:cap:sync`

Builds web assets for mobile and syncs them into native Capacitor projects:
1. `npm run mobile:web:build`
2. `npx cap sync`

## mobile:cap:sync:ios

Command:
- `npm run mobile:cap:sync:ios`

Builds web assets and syncs only the iOS Capacitor project:
1. `npm run mobile:web:build`
2. `npx cap sync ios`

## mobile:cap:sync:android

Command:
- `npm run mobile:cap:sync:android`

Builds web assets and syncs only the Android Capacitor project:
1. `npm run mobile:web:build`
2. `npx cap sync android`

## mobile:ios:add

Command:
- `npm run mobile:ios:add`

Adds the iOS Capacitor project:
- `npx cap add ios`

## mobile:android:add

Command:
- `npm run mobile:android:add`

Adds the Android Capacitor project:
- `npx cap add android`

## mobile:ios

Command:
- `npm run mobile:ios`

Builds/syncs Capacitor assets, then opens Xcode:
1. `npm run mobile:cap:sync:ios`
2. `npx cap open ios`

## mobile:android

Command:
- `npm run mobile:android`

Builds/syncs Capacitor assets, then opens Android Studio:
1. `npm run mobile:cap:sync:android`
2. `npx cap open android`

## mobile:ios:live

Command:
- `npm run mobile:ios:live`

Runs iOS with Capacitor live reload against the local dev server:
- `rm -rf ios/DerivedData && npx cap run ios --no-sync --live-reload --host=localhost --port=3000`

Use alongside `npm run mobile:dev` in another terminal.
Run `npm run mobile:cap:sync:ios` before first use and after plugin/native config changes.

## mobile:android:live

Command:
- `npm run mobile:android:live`

Runs Android with Capacitor live reload against the local dev server:
- `npx cap run android --no-sync --live-reload --host=10.0.2.2 --port=3000`

`10.0.2.2` maps Android Emulator requests to the host machine. Use alongside `npm run mobile:dev` in another terminal.
Run `npm run mobile:cap:sync:android` before first use and after plugin/native config changes.

## clean

Command:
- `npm run clean`

Deletes build outputs:
- `.next`
- `.next-build`
- `.next-dev`

## clean:mobile

Command:
- `npm run clean:mobile`

Deletes only the mobile export output:
- `.next-build`

Use this for Capacitor sync flows so a running `npm run dev` process does not lose its `.next-dev` server artifacts.

## lint

Command:
- `npm run lint`

Runs:
- `next lint`

## typecheck

Command:
- `npm run typecheck`

Runs:

1. Next type generation:
   - `NEXT_EXPORT_MODE=0 next typegen`
2. TypeScript check:
   - `tsc --noEmit --incremental false`
