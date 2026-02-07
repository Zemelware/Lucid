"use client";

import { motion } from "framer-motion";
import { ImagePlus, MoonStar, Waves } from "lucide-react";

import { useAudioStore } from "@/store/use-audio-store";

type DreamControlsProps = {
  onUploadClick: () => void;
};

export function DreamControls({ onUploadClick }: DreamControlsProps) {
  const isPlaying = useAudioStore((state) => state.isPlaying);
  const setIsPlaying = useAudioStore((state) => state.setIsPlaying);

  return (
    <motion.div
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      className="glass-panel w-full max-w-xl px-5 py-5 text-white sm:px-7 sm:py-6"
    >
      <p className="text-xs uppercase tracking-[0.35em] text-indigo-100/85">Lucid</p>
      <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Drift Into The Scene</h1>
      <p className="mt-3 max-w-md text-sm text-indigo-100/80 sm:text-base">
        Upload an image, breathe slowly, and let the dream guide assemble sound around you.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={onUploadClick}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium transition hover:bg-white/15"
        >
          <ImagePlus className="size-4" aria-hidden="true" />
          Upload
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium transition hover:bg-white/15"
        >
          <MoonStar className="size-4" aria-hidden="true" />
          Dream
        </button>
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-indigo-100/20 bg-indigo-100/15 px-4 py-2.5 text-sm font-semibold text-indigo-50 transition hover:bg-indigo-100/25"
        >
          <Waves className="size-4" aria-hidden="true" />
          {isPlaying ? "Pause" : "Play"}
        </button>
      </div>
    </motion.div>
  );
}
