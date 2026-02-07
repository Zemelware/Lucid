"use client";

import { motion } from "framer-motion";
import { Dices, ImagePlus, MoonStar, Sparkles, Waves } from "lucide-react";

type DreamControlsProps = {
  onUploadClick: () => void;
  onCreateSceneClick: () => void;
  onRandomSceneClick: () => void;
  onScenePromptChange: (value: string) => void;
  onDreamClick: () => void;
  onPlayToggle: () => void;
  scenePrompt: string;
  isGeneratingScene: boolean;
  isDreaming: boolean;
  isPlaying: boolean;
  canCreateScene: boolean;
  canRandomScene: boolean;
  canDream: boolean;
  canPlayAudio: boolean;
  statusMessage: string | null;
  dreamError: string | null;
};

export function DreamControls({
  onUploadClick,
  onCreateSceneClick,
  onRandomSceneClick,
  onScenePromptChange,
  onDreamClick,
  onPlayToggle,
  scenePrompt,
  isGeneratingScene,
  isDreaming,
  isPlaying,
  canCreateScene,
  canRandomScene,
  canDream,
  canPlayAudio,
  statusMessage,
  dreamError
}: DreamControlsProps) {
  const createButtonClassName = [
    "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition",
    canCreateScene
      ? "border-violet-100/25 bg-violet-100/15 text-violet-50 hover:bg-violet-100/25"
      : "cursor-not-allowed border-violet-100/10 bg-violet-100/10 text-violet-100/55"
  ].join(" ");
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
  const randomButtonClassName = [
    "inline-flex items-center justify-center rounded-2xl border px-3 py-2.5 transition",
    canRandomScene
      ? "border-white/20 bg-white/10 text-white hover:bg-white/18"
      : "cursor-not-allowed border-white/10 bg-white/5 text-white/55"
  ].join(" ");

  return (
    <motion.div
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      className="glass-panel w-full max-w-xl px-4 py-4 text-white sm:px-5 sm:py-5"
    >
      <p className="text-[11px] uppercase tracking-[0.32em] text-indigo-100/80">Lucid</p>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="text"
          value={scenePrompt}
          onChange={(event) => onScenePromptChange(event.currentTarget.value)}
          placeholder="Describe a dream scene"
          className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-indigo-100/60 focus:border-violet-200/45 focus:outline-none"
        />
        <button
          type="button"
          onClick={onCreateSceneClick}
          disabled={!canCreateScene || isGeneratingScene}
          className={createButtonClassName}
        >
          <Sparkles className="size-4" aria-hidden="true" />
          {isGeneratingScene ? "Creating..." : "Create Scene"}
        </button>
        <button
          type="button"
          onClick={onRandomSceneClick}
          disabled={!canRandomScene || isGeneratingScene}
          className={randomButtonClassName}
          aria-label="Create random scene"
          title="Create random scene"
        >
          <Dices className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
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
