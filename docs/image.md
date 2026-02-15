# Image Generation

Client hook: `src/hooks/useDreamImage.ts`  
Route: `src/app/api/generate-image/route.ts`

## Purpose

Creates a liminal dream scene image for the canvas, either from:

- A user prompt (`prompt`)
- Random mode (`random: true`)

## Models

The route selects between models:

- Default: `google/gemini-2.5-flash-image`
- High-res: `google/gemini-3-pro-image-preview` (when `isHighRes: true`)

## Response Handling

The route tries to pull out one usable image from model output:

- Prefer a `data:image/...;base64,...` URL if present
- Otherwise accept a `http(s)://...` URL

Client-side, `useDreamImage` returns:

```ts
export type GeneratedDreamImage = {
  imageUrl: string | null;
  imageDataUrl: string | null;
};
```

## UI Integration

`src/components/dream-canvas/dream-canvas.tsx`:

- Uses `imageDataUrl` or `imageUrl` as `next/image` `src` (with `unoptimized` + custom loader returning `src`).
- Clears any previous analysis/audio when a new image is uploaded or generated.

