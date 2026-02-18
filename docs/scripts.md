# Scripts (npm)

Scripts live in `package.json`. These are non-trivial because they affect build output, local state, and type generation.

## dev

Command:
- `npm run dev`

Runs Next dev server using Node 22:
- `NEXT_EXPORT_MODE=0 npx -y node@22 ./node_modules/next/dist/bin/next dev`

## build

Command:
- `npm run build`

Behavior:

1. Runs `clean` (deletes build outputs)
2. Builds Next using Node 22:
   - `NEXT_EXPORT_MODE=0 npx -y node@22 ./node_modules/next/dist/bin/next build`

## start

Command:
- `npm run start`

Starts the production server using Node 22:
- `NEXT_EXPORT_MODE=0 npx -y node@22 ./node_modules/next/dist/bin/next start`

## mobile:web:build

Command:
- `npm run mobile:web:build`

Builds a static export intended for Capacitor:
- Runs `clean`
- Sets `NEXT_EXPORT_MODE=1`
- Runs Next build with Node 22

`NEXT_EXPORT_MODE=1` enables static export behavior in `next.config.ts`.

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

## clean

Command:
- `npm run clean`

Deletes build outputs:
- `.next`
- `.next-build`

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
   - `NEXT_EXPORT_MODE=0 npx -y node@22 ./node_modules/next/dist/bin/next typegen`
2. TypeScript check:
   - `tsc --noEmit --incremental false`
