# Lucid

Lucid is an ASMR dreamscape generator built with Next.js. It turns a static image (uploaded or AI-generated) into a guided, 8D spatial-audio experience with an ASMR narrated dream script and moving 3D sound effects.

## What It Does

- Upload an image from your device, or generate a new scene using Nano Banana/Nano Banana Pro.
- Analyze the scene with Gemini to produce:
  - A second-person narrative
  - A sound effects timeline with start/end positions in 3D space, timing, volume, etc. for each sound effect
- Generate narrator voice and SFX audio with ElevenLabs.
- Play everything through a Web Audio graph using `PannerNode` + `HRTF` for binaural-style spatialization.
- Provide playback controls (play/pause/seek) and live SFX mixing (master + per-effect volumes).

## Current Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS + Framer Motion
- Zustand
- OpenRouter SDK
- ElevenLabs SDK

## Requirements

- Node.js 20-22 (project `engines` is `>=20 <23`)
- Recommended Node.js 22 (`.nvmrc` is set to `22`)
- npm
- OpenRouter API key
- ElevenLabs API key

## Environment Variables

Create `.env.local`:

```bash
OPENROUTER_API_KEY=...
ELEVENLABS_API_KEY=...
```

## Quick Start

Run these commands:

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Using Lucid

1. Upload an image, or generate a new scene (with a prompt or randomized by clicking the dice icon).
2. Click **Dream** to generate narration and ambient sound.
3. Press play and adjust SFX mix controls if needed.

## Binaural Audio / 8D Audio

Lucid uses binaural-style spatial audio so sound feels physically placed around you, not just panned left/right.

- Sound effects are spatialized with Web Audio `PannerNode` using `panningModel: "HRTF"`.
- Sounds are not always static: each effect can start in one position in 3D space and move to another over time.
- This creates directional depth, so sounds can pass in front of you, drift behind you, or travel across your left/right periphery.
- Narration stays intimate and centered while the world audio shifts and evolves around you.

For the strongest effect, use headphones in a quiet environment.

## Notes

- Headphones are strongly recommended for directional depth.
