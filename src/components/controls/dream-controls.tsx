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
  narrative: string | null;
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
  dreamError,
  narrative
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
      className="glass-panel w-full max-w-3xl px-5 py-5 text-white sm:px-7 sm:py-6"
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
          onClick={onDreamClick}
          disabled={!canDream || isDreaming}
          className={dreamButtonClassName}
        >
          <MoonStar className="size-4" aria-hidden="true" />
          {isDreaming ? "Dreaming..." : "Dream"}
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

      {statusMessage ? <p className="mt-4 text-sm text-indigo-100/80">{statusMessage}</p> : null}
      {dreamError ? <p className="mt-2 text-sm text-rose-200">{dreamError}</p> : null}

      <motion.section
        key={narrative ?? "script-placeholder"}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: "easeOut" }}
        className="relative mt-5 overflow-hidden rounded-3xl border border-white/15 bg-black/20 p-4 sm:p-5"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-[#0b0e22] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-[#0b0e22] to-transparent" />

        <p className="text-[11px] uppercase tracking-[0.3em] text-indigo-100/80">Dream Script</p>
        <motion.p
          animate={narrative ? { opacity: [0.5, 1, 0.5], y: [5, 0, -5] } : { opacity: 0.9 }}
          transition={
            narrative
              ? { duration: 12, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }
              : { duration: 0.2 }
          }
          className="mt-3 max-h-52 overflow-y-auto pr-1 text-sm leading-7 text-indigo-50/95 sm:max-h-60 sm:text-base"
        >
          {narrative ??
            "Your dream script will appear here after you upload an image and press Dream."}
        </motion.p>
      </motion.section>
    </motion.div>
  );
}
