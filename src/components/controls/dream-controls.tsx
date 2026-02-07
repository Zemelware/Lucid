"use client";

import { motion } from "framer-motion";
import { ImagePlus, MoonStar, Waves } from "lucide-react";

type DreamControlsProps = {
  onUploadClick: () => void;
  onDreamClick: () => void;
  onPlayToggle: () => void;
  isDreaming: boolean;
  isPlaying: boolean;
  canDream: boolean;
  canPlayAudio: boolean;
  statusMessage: string | null;
  dreamError: string | null;
};

export function DreamControls({
  onUploadClick,
  onDreamClick,
  onPlayToggle,
  isDreaming,
  isPlaying,
  canDream,
  canPlayAudio,
  statusMessage,
  dreamError
}: DreamControlsProps) {
  const dreamButtonClassName = [
    "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition",
    canDream
      ? "border-white/15 bg-white/5 hover:bg-white/15"
      : "cursor-not-allowed border-white/10 bg-white/5 text-white/55"
  ].join(" ");
  const playButtonClassName = [
    "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition",
    canPlayAudio
      ? "border-indigo-100/20 bg-indigo-100/15 text-indigo-50 hover:bg-indigo-100/25"
      : "cursor-not-allowed border-indigo-100/10 bg-indigo-100/10 text-indigo-100/55"
  ].join(" ");

  return (
    <motion.div
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      className="glass-panel w-full max-w-xl px-4 py-4 text-white sm:px-5 sm:py-5"
    >
      <p className="text-[11px] uppercase tracking-[0.32em] text-indigo-100/80">Lucid</p>

      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <button
          type="button"
          onClick={onUploadClick}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium transition hover:bg-white/18"
        >
          <ImagePlus className="size-4" aria-hidden="true" />
          Upload
        </button>
        <button
          type="button"
          onClick={onDreamClick}
          disabled={!canDream || isDreaming}
          className={dreamButtonClassName}
        >
          <MoonStar className="size-4" aria-hidden="true" />
          {isDreaming ? "Working..." : "Dream"}
        </button>
        <button
          type="button"
          onClick={onPlayToggle}
          disabled={!canPlayAudio}
          className={playButtonClassName}
        >
          <Waves className="size-4" aria-hidden="true" />
          {isPlaying ? "Pause" : "Play"}
        </button>
      </div>

      {statusMessage ? <p className="mt-3 text-xs text-indigo-100/75">{statusMessage}</p> : null}
      {dreamError ? <p className="mt-2 text-xs text-rose-200">{dreamError}</p> : null}
    </motion.div>
  );
}
