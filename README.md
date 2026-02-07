# Lucid

Lucid is an ASMR Dreamscape Generator that turns a static image (uploaded or AI-generated) into a guided, spatial-audio dream experience.

## Core Experience

- Analyze an image with Gemini to generate:
  - A second-person dream narrative
  - 3 spatial SFX cues with 3D coordinates
- Generate narrator voice and ambient SFX with ElevenLabs
- Play everything through a Web Audio spatial graph using HRTF panners

## Binaural / Spatial Audio

Lucid uses `PannerNode` with `panningModel: "HRTF"` to simulate directional hearing:

- Left/right placement comes from `x`
- Front/back placement comes from `z`
- Vertical placement comes from `y`

This creates a true 3D soundstage effect (not basic stereo), so water can feel left of you, a crackling source can feel behind you, and narration can stay centered and intimate.

## Headphone Recommendation

For the best binaural effect:

- Use headphones (not speakers)
- Prefer wired over-ear or good in-ear stereo headphones
- Sit in a quiet room at moderate volume
- Keep left/right channels correctly oriented

Without headphones, the front/back and depth cues are much weaker.

## Tech Stack

- Next.js App Router + React + TypeScript
- Tailwind CSS + Framer Motion
- Zustand for audio state
- OpenRouter SDK (`google/gemini-3-flash-preview`, `google/gemini-2.5-flash-image`)
- ElevenLabs for TTS and SFX

## Environment Variables

Create `.env.local`:

```bash
OPENROUTER_API_KEY=...
ELEVENLABS_API_KEY=...
```

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.
