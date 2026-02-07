"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useSettingsStore } from "@/store/use-settings-store";
import type { DreamAudioAssets, Position3D, TimelineSfxCue } from "@/types/dream";

type SpatialTrack = {
  element: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  panner?: PannerNode;
};

type TimelineCueTrack = {
  cue: TimelineSfxCue;
  track: SpatialTrack;
};

type SpatialGraph = {
  narrator: SpatialTrack;
  sfx: SpatialTrack[];
  sfxMasterGain: GainNode;
  timelineCueTracks: TimelineCueTrack[];
  timelineTotalDurationSeconds: number | null;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function toAudioUnits(value: number): number {
  return clamp(value, -10, 10);
}

function mapSceneDepthToPannerZ(z: number): number {
  // Scene convention is z < 0 as "behind", so we invert for Web Audio's forward axis.
  return toAudioUnits(-z);
}

function disposeAudioElement(audio: HTMLAudioElement): void {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

function setPannerPosition(context: AudioContext, panner: PannerNode, position: Position3D): void {
  panner.positionX.setValueAtTime(toAudioUnits(position.x), context.currentTime);
  panner.positionY.setValueAtTime(toAudioUnits(position.y), context.currentTime);
  panner.positionZ.setValueAtTime(mapSceneDepthToPannerZ(position.z), context.currentTime);
}

function createPanner(context: AudioContext, position: Position3D): PannerNode {
  const panner = new PannerNode(context, {
    panningModel: "HRTF",
    distanceModel: "inverse",
    refDistance: 1,
    maxDistance: 30,
    rolloffFactor: 1,
    coneInnerAngle: 360,
    coneOuterAngle: 360,
    coneOuterGain: 1,
  });

  setPannerPosition(context, panner, position);
  return panner;
}

function createAudioElement(blobUrl: string, loop: boolean): HTMLAudioElement {
  const element = new Audio(blobUrl);
  element.preload = "auto";
  element.loop = loop;
  element.crossOrigin = "anonymous";
  element.volume = 1;
  return element;
}

function createSfxTrack(
  context: AudioContext,
  destination: AudioNode,
  blobUrl: string,
  cue: TimelineSfxCue,
  initialPosition: Position3D,
  initialGain: number,
  shouldLoop: boolean,
): SpatialTrack {
  const element = createAudioElement(blobUrl, shouldLoop);
  const source = context.createMediaElementSource(element);
  const panner = createPanner(context, initialPosition);
  const gain = context.createGain();
  gain.gain.setValueAtTime(clamp(initialGain, 0, 1), context.currentTime);

  source.connect(panner);
  panner.connect(gain);
  gain.connect(destination);

  return { element, source, panner, gain };
}

type SpatialAudioHook = {
  error: string | null;
  currentTimeSeconds: number;
  durationSeconds: number;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => void;
  seek: (timeSeconds: number) => void;
};

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function readDuration(element: HTMLAudioElement): number | null {
  return Number.isFinite(element.duration) && element.duration > 0 ? element.duration : null;
}

function clampTimelineTime(timeSeconds: number, duration: number | null): number {
  if (!Number.isFinite(timeSeconds) || timeSeconds < 0) {
    return 0;
  }

  if (!duration) {
    return timeSeconds;
  }

  return Math.min(timeSeconds, duration);
}

function seekElement(track: SpatialTrack, timelineTime: number): void {
  const duration = readDuration(track.element);
  const nextTime = duration
    ? track.element.loop
      ? timelineTime % duration
      : Math.min(timelineTime, duration)
    : timelineTime;

  track.element.currentTime = nextTime;
}

function toTimelineTime(
  narratorTimeSeconds: number,
  narratorDurationSeconds: number | null,
  timelineTotalSeconds: number,
): number {
  if (!Number.isFinite(narratorTimeSeconds) || narratorTimeSeconds <= 0) {
    return 0;
  }

  if (!narratorDurationSeconds || narratorDurationSeconds <= 0) {
    return clamp(narratorTimeSeconds, 0, timelineTotalSeconds);
  }

  const progress = clamp(narratorTimeSeconds / narratorDurationSeconds, 0, 1);
  return progress * timelineTotalSeconds;
}

function readCueFadeSeconds(value: number | undefined, cueDurationSeconds: number): number {
  const fallbackFade = 3;
  const desiredFade = typeof value === "number" ? value : fallbackFade;
  const clampedFade = clamp(desiredFade, 0.5, 5);
  return Math.min(clampedFade, cueDurationSeconds / 2);
}

function interpolatePosition(
  startPosition: Position3D,
  endPosition: Position3D,
  progress: number,
): Position3D {
  return {
    x: lerp(startPosition.x, endPosition.x, progress),
    y: lerp(startPosition.y, endPosition.y, progress),
    z: lerp(startPosition.z, endPosition.z, progress),
  };
}

function computeCueEnvelope(cue: TimelineSfxCue, timelineTimeSeconds: number): number {
  if (timelineTimeSeconds < cue.start_sec || timelineTimeSeconds > cue.end_sec) {
    return 0;
  }

  const cueDurationSeconds = cue.end_sec - cue.start_sec;
  if (cueDurationSeconds <= 0) {
    return 0;
  }

  const fadeInSeconds = readCueFadeSeconds(cue.fade_in_sec, cueDurationSeconds);
  const fadeOutSeconds = readCueFadeSeconds(cue.fade_out_sec, cueDurationSeconds);
  const secondsFromStart = timelineTimeSeconds - cue.start_sec;
  const secondsToEnd = cue.end_sec - timelineTimeSeconds;

  const fadeInEnvelope = fadeInSeconds > 0 ? clamp(secondsFromStart / fadeInSeconds, 0, 1) : 1;
  const fadeOutEnvelope = fadeOutSeconds > 0 ? clamp(secondsToEnd / fadeOutSeconds, 0, 1) : 1;

  return Math.min(fadeInEnvelope, fadeOutEnvelope);
}

export function useSpatialAudio(preparedAudio: DreamAudioAssets | null): SpatialAudioHook {
  const [error, setError] = useState<string | null>(null);
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);
  const audioContextRef = useRef<AudioContext | null>(null);
  const graphRef = useRef<SpatialGraph | null>(null);
  const detachNarratorListenersRef = useRef<(() => void) | null>(null);
  const timelineAnimationFrameRef = useRef<number | null>(null);

  const ensureAudioContext = useCallback((): AudioContext => {
    if (audioContextRef.current) {
      return audioContextRef.current;
    }

    const AudioContextCtor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!AudioContextCtor) {
      throw new Error("Web Audio is not supported in this browser.");
    }

    const context = new AudioContextCtor();
    audioContextRef.current = context;
    return context;
  }, []);

  const stopTimelineAnimation = useCallback(() => {
    if (timelineAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(timelineAnimationFrameRef.current);
      timelineAnimationFrameRef.current = null;
    }
  }, []);

  const applyTimelineAtNarratorTime = useCallback(
    (graph: SpatialGraph, narratorTimeSeconds: number) => {
      if (graph.timelineCueTracks.length === 0 || !graph.timelineTotalDurationSeconds) {
        return;
      }

      const context = audioContextRef.current;
      if (!context) {
        return;
      }

      const narratorDurationSeconds = readDuration(graph.narrator.element);
      const timelineTimeSeconds = toTimelineTime(
        narratorTimeSeconds,
        narratorDurationSeconds,
        graph.timelineTotalDurationSeconds,
      );

      graph.timelineCueTracks.forEach(({ cue, track }) => {
        const envelope = computeCueEnvelope(cue, timelineTimeSeconds);
        const gain = clamp(cue.volume, 0, 1) * envelope;
        track.gain.gain.setValueAtTime(gain, context.currentTime);

        const cueDurationSeconds = cue.end_sec - cue.start_sec;
        const progress =
          cueDurationSeconds > 0
            ? clamp((timelineTimeSeconds - cue.start_sec) / cueDurationSeconds, 0, 1)
            : 0;

        const nextPosition = interpolatePosition(cue.position_start, cue.position_end, progress);
        if (track.panner) {
          setPannerPosition(context, track.panner, nextPosition);
        }
      });
    },
    [],
  );

  const runTimelineFrame = useCallback(() => {
    const graph = graphRef.current;
    if (!graph || graph.timelineCueTracks.length === 0) {
      timelineAnimationFrameRef.current = null;
      return;
    }

    const narratorTimeSeconds = graph.narrator.element.currentTime;
    applyTimelineAtNarratorTime(graph, narratorTimeSeconds);
    setCurrentTimeSeconds(narratorTimeSeconds);

    if (!graph.narrator.element.paused && !graph.narrator.element.ended) {
      timelineAnimationFrameRef.current = window.requestAnimationFrame(runTimelineFrame);
      return;
    }

    timelineAnimationFrameRef.current = null;
  }, [applyTimelineAtNarratorTime]);

  const startTimelineAnimation = useCallback(() => {
    stopTimelineAnimation();
    timelineAnimationFrameRef.current = window.requestAnimationFrame(runTimelineFrame);
  }, [runTimelineFrame, stopTimelineAnimation]);

  const teardownGraph = useCallback(() => {
    stopTimelineAnimation();
    detachNarratorListenersRef.current?.();
    detachNarratorListenersRef.current = null;

    const graph = graphRef.current;
    if (!graph) {
      setCurrentTimeSeconds(0);
      setDurationSeconds(0);
      return;
    }

    const tracks = [graph.narrator, ...graph.sfx];
    tracks.forEach((track) => {
      track.source.disconnect();
      track.gain.disconnect();
      track.panner?.disconnect();
      disposeAudioElement(track.element);
    });

    graph.sfxMasterGain.disconnect();

    graphRef.current = null;
    setCurrentTimeSeconds(0);
    setDurationSeconds(0);
  }, [stopTimelineAnimation]);

  const setupGraph = useCallback(
    (assets: DreamAudioAssets) => {
      const context = ensureAudioContext();
      const timeline = assets.timeline;

      teardownGraph();

      const narratorElement = createAudioElement(assets.narrator.blobUrl, false);
      const narratorSource = context.createMediaElementSource(narratorElement);
      const narratorGain = context.createGain();
      narratorGain.gain.setValueAtTime(1.05, context.currentTime);
      narratorSource.connect(narratorGain);
      narratorGain.connect(context.destination);

      const sfxMasterGain = context.createGain();
      sfxMasterGain.gain.setValueAtTime(useSettingsStore.getState().sfxVolume, context.currentTime);
      sfxMasterGain.connect(context.destination);

      const sfxTracks = assets.sfx.map((asset, index) => {
        const timelineCue = timeline.cues[index];
        const initialPosition = timelineCue?.position_start ?? asset.cue.position_start;
        const initialGain = 0;
        const shouldLoop = true;

        return createSfxTrack(
          context,
          sfxMasterGain,
          asset.blobUrl,
          asset.cue,
          initialPosition,
          initialGain,
          shouldLoop,
        );
      });

      const timelineCueTracks: TimelineCueTrack[] = timeline.cues
        .map((cue, index) => {
          const track = sfxTracks[index];
          if (!track) {
            return null;
          }

          return { cue, track };
        })
        .filter((entry): entry is TimelineCueTrack => entry !== null);

      graphRef.current = {
        narrator: {
          element: narratorElement,
          source: narratorSource,
          gain: narratorGain,
        },
        sfx: sfxTracks,
        sfxMasterGain,
        timelineCueTracks,
        timelineTotalDurationSeconds: timeline.total_duration_sec,
      };

      const syncDuration = () => {
        const duration = readDuration(narratorElement) ?? 0;
        setDurationSeconds(duration);
      };

      const syncCurrentTime = () => {
        const nextTime = narratorElement.currentTime;
        setCurrentTimeSeconds(nextTime);

        const graph = graphRef.current;
        if (graph) {
          applyTimelineAtNarratorTime(graph, nextTime);
        }
      };

      const handleEnded = () => {
        const duration = readDuration(narratorElement);
        const nextTime = duration ?? narratorElement.currentTime;
        setCurrentTimeSeconds(nextTime);
        stopTimelineAnimation();

        const graph = graphRef.current;
        if (graph) {
          applyTimelineAtNarratorTime(graph, nextTime);
        }
      };

      narratorElement.addEventListener("loadedmetadata", syncDuration);
      narratorElement.addEventListener("durationchange", syncDuration);
      narratorElement.addEventListener("timeupdate", syncCurrentTime);
      narratorElement.addEventListener("ended", handleEnded);

      syncDuration();
      syncCurrentTime();

      detachNarratorListenersRef.current = () => {
        narratorElement.removeEventListener("loadedmetadata", syncDuration);
        narratorElement.removeEventListener("durationchange", syncDuration);
        narratorElement.removeEventListener("timeupdate", syncCurrentTime);
        narratorElement.removeEventListener("ended", handleEnded);
      };
    },
    [applyTimelineAtNarratorTime, ensureAudioContext, stopTimelineAnimation, teardownGraph],
  );

  useEffect(() => {
    setError(null);

    if (!preparedAudio) {
      teardownGraph();
      return;
    }

    try {
      setupGraph(preparedAudio);
    } catch (setupError) {
      setError(readErrorMessage(setupError, "Failed to initialize spatial audio."));
    }
  }, [preparedAudio, setupGraph, teardownGraph]);

  useEffect(() => {
    const graph = graphRef.current;
    if (graph && audioContextRef.current) {
      graph.sfxMasterGain.gain.setTargetAtTime(
        sfxVolume,
        audioContextRef.current.currentTime,
        0.05,
      );
    }
  }, [sfxVolume]);

  const play = useCallback(async () => {
    const graph = graphRef.current;
    if (!graph) {
      throw new Error("Dream audio is not ready yet.");
    }

    setError(null);

    const context = ensureAudioContext();
    if (context.state === "suspended") {
      await context.resume();
    }

    const elements = [graph.narrator.element, ...graph.sfx.map((track) => track.element)];
    elements.forEach((element) => {
      if (element.ended) {
        element.currentTime = 0;
      }
    });

    await Promise.all(elements.map((element) => element.play()));

    if (graph.timelineCueTracks.length > 0) {
      startTimelineAnimation();
    }
  }, [ensureAudioContext, startTimelineAnimation]);

  const pause = useCallback(async () => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }

    stopTimelineAnimation();

    [graph.narrator.element, ...graph.sfx.map((track) => track.element)].forEach((element) => {
      element.pause();
    });

    const context = audioContextRef.current;
    if (context && context.state === "running") {
      await context.suspend();
    }
  }, [stopTimelineAnimation]);

  const stop = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) {
      setCurrentTimeSeconds(0);
      return;
    }

    stopTimelineAnimation();

    [graph.narrator.element, ...graph.sfx.map((track) => track.element)].forEach((element) => {
      element.pause();
      element.currentTime = 0;
    });

    applyTimelineAtNarratorTime(graph, 0);
    setCurrentTimeSeconds(0);
  }, [applyTimelineAtNarratorTime, stopTimelineAnimation]);

  const seek = useCallback(
    (timeSeconds: number) => {
      const graph = graphRef.current;
      if (!graph) {
        return;
      }

      const narratorDuration = readDuration(graph.narrator.element);
      const timelineTime = clampTimelineTime(timeSeconds, narratorDuration);
      seekElement(graph.narrator, timelineTime);
      graph.sfx.forEach((track) => {
        seekElement(track, timelineTime);
      });

      applyTimelineAtNarratorTime(graph, timelineTime);
      setCurrentTimeSeconds(timelineTime);
    },
    [applyTimelineAtNarratorTime],
  );

  useEffect(() => {
    return () => {
      teardownGraph();

      const context = audioContextRef.current;
      if (context) {
        void context.close();
        audioContextRef.current = null;
      }
    };
  }, [teardownGraph]);

  return {
    error,
    currentTimeSeconds,
    durationSeconds,
    play: async () => {
      try {
        await play();
      } catch (playError) {
        const message = readErrorMessage(playError, "Failed to start spatial playback.");
        setError(message);
        throw new Error(message);
      }
    },
    pause,
    stop,
    seek,
  };
}
