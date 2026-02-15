# Scripts (npm)

Scripts live in `package.json`. These are non-trivial because they affect build output, local state, and type generation.

## dev

Command:
- `npm run dev`

Runs Next dev server using Node 22:
- `npx -y node@22 ./node_modules/next/dist/bin/next dev`

## build

Command:
- `npm run build`

Behavior:

1. Runs `clean` (deletes build outputs)
2. Builds Next using Node 22:
   - `npx -y node@22 ./node_modules/next/dist/bin/next build`

## start

Command:
- `npm run start`

Starts the production server using Node 22:
- `npx -y node@22 ./node_modules/next/dist/bin/next start`

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
   - `npx -y node@22 ./node_modules/next/dist/bin/next typegen`
2. TypeScript check:
   - `tsc --noEmit --incremental false`

