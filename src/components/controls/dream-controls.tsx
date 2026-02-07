"use client";

import { useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Dices,
  ImagePlus,
  MoonStar,
  Pause,
  Play,
  Sparkles,
} from "lucide-react";

type DreamControlsProps = {
  onUploadClick: () => void;
  onCreateSceneClick: () => void;
  onRandomSceneClick: () => void;
  onScenePromptChange: (value: string) => void;
  onDreamClick: () => void;
  onPlayToggle: () => void;
  onPlaybackSeek: (seconds: number) => void;
  scenePrompt: string;
  isGeneratingScene: boolean;
  isDreaming: boolean;
  isPlaying: boolean;
  canCreateScene: boolean;
  canRandomScene: boolean;
  canDream: boolean;
  canPlayAudio: boolean;
  canSeekAudio: boolean;
  showPlaybackControls: boolean;
  playbackTimeSeconds: number;
  playbackDurationSeconds: number;
  panelTone: "light" | "dark";
  dreamError: string | null;
};

function formatPlaybackTime(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function DreamControls({
  onUploadClick,
  onCreateSceneClick,
  onRandomSceneClick,
  onScenePromptChange,
  onDreamClick,
  onPlayToggle,
  onPlaybackSeek,
  scenePrompt,
  isGeneratingScene,
  isDreaming,
  isPlaying,
  canCreateScene,
  canRandomScene,
  canDream,
  canPlayAudio,
  canSeekAudio,
  showPlaybackControls,
  playbackTimeSeconds,
  playbackDurationSeconds,
  panelTone,
  dreamError,
}: DreamControlsProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const createButtonClassName = [
    "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition",
    canCreateScene
      ? "border-violet-100/25 bg-violet-100/15 text-violet-50 hover:bg-violet-100/25"
      : "cursor-not-allowed border-violet-100/10 bg-violet-100/10 text-violet-100/55",
  ].join(" ");
  const dreamButtonClassName = [
    "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition",
    canDream
      ? "border-white/15 bg-white/5 hover:bg-white/15"
      : "cursor-not-allowed border-white/10 bg-white/5 text-white/55",
  ].join(" ");
  const playButtonClassName = [
    "inline-flex size-8 items-center justify-center rounded-xl border transition",
    canPlayAudio
      ? "border-indigo-100/20 bg-indigo-100/15 text-indigo-50 hover:bg-indigo-100/25"
      : "cursor-not-allowed border-indigo-100/10 bg-indigo-100/10 text-indigo-100/55",
  ].join(" ");
  const randomButtonClassName = [
    "inline-flex items-center justify-center rounded-2xl border px-3 py-2.5 transition",
    canRandomScene
      ? "border-white/20 bg-white/10 text-white hover:bg-white/18"
      : "cursor-not-allowed border-white/10 bg-white/5 text-white/55",
  ].join(" ");
  const panelToggleButtonClassName =
    "inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 p-2 text-indigo-100/85 transition hover:bg-white/12";
  const panelToneClassName =
    panelTone === "dark"
      ? "border-white/10 bg-slate-950/45 text-slate-100 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl"
      : "border-white/20 bg-white/10 text-white shadow-glass backdrop-blur-xl";
  const sliderMax = playbackDurationSeconds > 0 ? playbackDurationSeconds : 1;
  const sliderValue =
    playbackDurationSeconds > 0 ? Math.min(playbackTimeSeconds, playbackDurationSeconds) : 0;
  const audioPanelClassName = [
    "rounded-xl border border-indigo-100/20 bg-black/20 px-2.5 py-2",
    isCollapsed ? "mt-2" : "mt-3",
  ].join(" ");
  const audioTrackClassName = [
    "h-1 w-full flex-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-indigo-200 disabled:cursor-not-allowed disabled:opacity-55",
    isCollapsed ? "max-w-[340px]" : "",
  ].join(" ");

  const renderPlaybackPanel = () => (
    <div className={audioPanelClassName}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPlayToggle}
          disabled={!canPlayAudio}
          className={playButtonClassName}
          aria-label={isPlaying ? "Pause dream audio" : "Play dream audio"}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="size-4" aria-hidden="true" />
          ) : (
            <Play className="size-4" aria-hidden="true" />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={sliderMax}
          step={0.05}
          value={sliderValue}
          onChange={(event) => {
            const nextValue = Number(event.currentTarget.value);
            if (!Number.isFinite(nextValue)) {
              return;
            }
            onPlaybackSeek(nextValue);
          }}
          disabled={!canSeekAudio}
          className={audioTrackClassName}
          aria-label="Dream playback timeline"
        />
        <span className="min-w-[72px] text-right text-[10px] tabular-nums text-indigo-100/75">
          {formatPlaybackTime(playbackTimeSeconds)} / {formatPlaybackTime(playbackDurationSeconds)}
        </span>
      </div>
    </div>
  );

  return (
    <motion.div
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      className={`w-full max-w-xl rounded-3xl border px-4 py-4 sm:px-5 sm:py-5 ${panelToneClassName}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.32em] text-indigo-100/80">Lucid</p>
        <button
          type="button"
          onClick={() => setIsCollapsed((previous) => !previous)}
          className={panelToggleButtonClassName}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Expand controls" : "Collapse controls"}
        >
          {isCollapsed ? (
            <ChevronUp className="size-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-3.5" aria-hidden="true" />
          )}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isCollapsed ? (
          <motion.div
            key="audio-only-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {showPlaybackControls ? renderPlaybackPanel() : null}
          </motion.div>
        ) : null}
        {!isCollapsed ? (
          <motion.div
            key="full-control-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: "easeInOut" }}
            className="overflow-hidden"
          >
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

            <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
            </div>

            {showPlaybackControls ? renderPlaybackPanel() : null}

            {dreamError ? <p className="mt-2 text-xs text-rose-200">{dreamError}</p> : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
