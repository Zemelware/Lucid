"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useSettingsStore } from "@/store/use-settings-store";
import type { DreamAudioAssets, Position3D, TimelineSfxCue } from "@/types/dream";

type NarratorTrack = {
  element: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
};

type CuePlayback = {
  source: AudioBufferSourceNode;
  startContextTime: number;
  startOffsetSeconds: number;
};

type TimelineCueTrack = {
  cue: TimelineSfxCue;
  buffer: AudioBuffer;
  gain: GainNode;
  panner: PannerNode;
  playback: CuePlayback | null;
};

type SpatialGraph = {
  narrator: NarratorTrack;
  sfxMasterGain: GainNode;
  timelineCueTracks: TimelineCueTrack[];
  timelineTotalDurationSeconds: number | null;
};

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

const CUE_END_GRACE_SECONDS = 0.12;
const LOOP_DRIFT_CORRECTION_THRESHOLD_SECONDS = 0.45;

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

function normalizeLoopOffset(value: number, cycleDuration: number): number {
  if (!Number.isFinite(cycleDuration) || cycleDuration <= 0) {
    return 0;
  }

  const normalized = value % cycleDuration;
  return normalized < 0 ? normalized + cycleDuration : normalized;
}

function computeCircularDrift(expected: number, actual: number, cycleDuration: number): number {
  const directDistance = Math.abs(expected - actual);
  return Math.min(directDistance, cycleDuration - directDistance);
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

function disposeAudioElement(audio: HTMLAudioElement): void {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
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

function isCueInsideCoreWindow(cue: TimelineSfxCue, timelineTimeSeconds: number): boolean {
  return timelineTimeSeconds >= cue.start_sec && timelineTimeSeconds <= cue.end_sec;
}

function shouldHoldCuePlayback(cue: TimelineSfxCue, timelineTimeSeconds: number): boolean {
  return timelineTimeSeconds >= cue.start_sec && timelineTimeSeconds <= cue.end_sec + CUE_END_GRACE_SECONDS;
}

function readCueBufferOffsetSeconds(cueTrack: TimelineCueTrack, timelineTimeSeconds: number): number {
  const elapsedCueSeconds = timelineTimeSeconds - cueTrack.cue.start_sec;
  if (cueTrack.cue.loop) {
    return normalizeLoopOffset(elapsedCueSeconds, cueTrack.buffer.duration);
  }

  return clamp(elapsedCueSeconds, 0, cueTrack.buffer.duration);
}

async function decodeAudioBuffer(context: AudioContext, blobUrl: string): Promise<AudioBuffer> {
  const response = await fetch(blobUrl);
  if (!response.ok) {
    throw new Error(`Failed to decode generated audio (${response.status}).`);
  }

  const data = await response.arrayBuffer();
  return context.decodeAudioData(data);
}

export function useSpatialAudio(preparedAudio: DreamAudioAssets | null): SpatialAudioHook {
  const [error, setError] = useState<string | null>(null);
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const sfxVolume = useSettingsStore((state) => state.sfxVolume);
  const sfxCueVolumes = useSettingsStore((state) => state.sfxCueVolumes);
  const audioContextRef = useRef<AudioContext | null>(null);
  const graphRef = useRef<SpatialGraph | null>(null);
  const isPlayingRef = useRef(false);
  const setupGenerationRef = useRef(0);
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

  const stopCuePlayback = useCallback((cueTrack: TimelineCueTrack) => {
    const playback = cueTrack.playback;
    if (!playback) {
      return;
    }

    cueTrack.playback = null;
    playback.source.onended = null;
    try {
      playback.source.stop(0);
    } catch {
      // Source may already be stopped.
    }
    playback.source.disconnect();
  }, []);

  const stopAllCuePlayback = useCallback(
    (graph: SpatialGraph) => {
      graph.timelineCueTracks.forEach((cueTrack) => {
        stopCuePlayback(cueTrack);
      });
    },
    [stopCuePlayback],
  );

  const startCuePlayback = useCallback(
    (context: AudioContext, cueTrack: TimelineCueTrack, timelineTimeSeconds: number) => {
      const duration = cueTrack.buffer.duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        return;
      }

      const offsetSeconds = readCueBufferOffsetSeconds(cueTrack, timelineTimeSeconds);
      const source = context.createBufferSource();
      source.buffer = cueTrack.buffer;
      source.loop = cueTrack.cue.loop;
      if (cueTrack.cue.loop) {
        source.loopStart = 0;
        source.loopEnd = duration;
      }

      source.connect(cueTrack.panner);
      cueTrack.playback = {
        source,
        startContextTime: context.currentTime,
        startOffsetSeconds: offsetSeconds,
      };

      source.onended = () => {
        if (cueTrack.playback?.source === source) {
          cueTrack.playback = null;
        }
      };

      source.start(0, offsetSeconds);

      if (!cueTrack.cue.loop) {
        const cueRemainingSeconds = Math.max(
          cueTrack.cue.end_sec + CUE_END_GRACE_SECONDS - timelineTimeSeconds,
          0,
        );
        const bufferRemainingSeconds = Math.max(duration - offsetSeconds, 0);
        source.stop(context.currentTime + Math.min(cueRemainingSeconds, bufferRemainingSeconds));
      }
    },
    [],
  );

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

      graph.timelineCueTracks.forEach((cueTrack) => {
        const { cue } = cueTrack;
        const envelope = computeCueEnvelope(cue, timelineTimeSeconds);
        const cueVolumeBoost = useSettingsStore.getState().sfxCueVolumes[cue.id] ?? 1;
        cueTrack.gain.gain.setValueAtTime(
          clamp(cue.volume * cueVolumeBoost, 0, 3) * envelope,
          context.currentTime,
        );

        const cueDurationSeconds = cue.end_sec - cue.start_sec;
        const progress =
          cueDurationSeconds > 0
            ? clamp((timelineTimeSeconds - cue.start_sec) / cueDurationSeconds, 0, 1)
            : 0;

        const nextPosition = interpolatePosition(cue.position_start, cue.position_end, progress);
        setPannerPosition(context, cueTrack.panner, nextPosition);
      });

      if (!isPlayingRef.current) {
        return;
      }

      graph.timelineCueTracks.forEach((cueTrack) => {
        const inCoreWindow = isCueInsideCoreWindow(cueTrack.cue, timelineTimeSeconds);
        const holdPlayback = shouldHoldCuePlayback(cueTrack.cue, timelineTimeSeconds);

        if (!holdPlayback) {
          stopCuePlayback(cueTrack);
          return;
        }

        if (!cueTrack.playback) {
          if (inCoreWindow) {
            startCuePlayback(context, cueTrack, timelineTimeSeconds);
          }
          return;
        }

        if (!cueTrack.cue.loop || !cueTrack.playback) {
          return;
        }

        const duration = cueTrack.buffer.duration;
        if (!Number.isFinite(duration) || duration <= 0) {
          return;
        }

        const expectedOffsetSeconds = readCueBufferOffsetSeconds(cueTrack, timelineTimeSeconds);
        const elapsedContextSeconds = Math.max(
          context.currentTime - cueTrack.playback.startContextTime,
          0,
        );
        const currentOffsetSeconds = normalizeLoopOffset(
          cueTrack.playback.startOffsetSeconds + elapsedContextSeconds,
          duration,
        );
        const driftSeconds = computeCircularDrift(
          expectedOffsetSeconds,
          currentOffsetSeconds,
          duration,
        );

        if (driftSeconds > LOOP_DRIFT_CORRECTION_THRESHOLD_SECONDS) {
          stopCuePlayback(cueTrack);
          if (inCoreWindow) {
            startCuePlayback(context, cueTrack, timelineTimeSeconds);
          }
        }
      });
    },
    [startCuePlayback, stopCuePlayback],
  );

  const runTimelineFrame = useCallback(() => {
    const graph = graphRef.current;
    if (!graph || graph.timelineCueTracks.length === 0) {
      timelineAnimationFrameRef.current = null;
      return;
    }

    applyTimelineAtNarratorTime(graph, graph.narrator.element.currentTime);

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
      isPlayingRef.current = false;
      setCurrentTimeSeconds(0);
      setDurationSeconds(0);
      return;
    }

    stopAllCuePlayback(graph);
    graph.timelineCueTracks.forEach((cueTrack) => {
      cueTrack.gain.disconnect();
      cueTrack.panner.disconnect();
    });

    graph.narrator.source.disconnect();
    graph.narrator.gain.disconnect();
    disposeAudioElement(graph.narrator.element);
    graph.sfxMasterGain.disconnect();

    graphRef.current = null;
    isPlayingRef.current = false;
    setCurrentTimeSeconds(0);
    setDurationSeconds(0);
  }, [stopAllCuePlayback, stopTimelineAnimation]);

  const setupGraph = useCallback(
    async (assets: DreamAudioAssets, setupGeneration: number) => {
      const context = ensureAudioContext();
      const timeline = assets.timeline;

      teardownGraph();

      const decodedSfxBuffers = await Promise.all(
        assets.sfx.map((asset) => decodeAudioBuffer(context, asset.blobUrl)),
      );
      if (setupGeneration !== setupGenerationRef.current) {
        return;
      }

      const narratorElement = createAudioElement(assets.narrator.blobUrl, false);
      const narratorSource = context.createMediaElementSource(narratorElement);
      const narratorGain = context.createGain();
      narratorGain.gain.setValueAtTime(1.05, context.currentTime);
      narratorSource.connect(narratorGain);
      narratorGain.connect(context.destination);

      const sfxMasterGain = context.createGain();
      sfxMasterGain.gain.setValueAtTime(useSettingsStore.getState().sfxVolume, context.currentTime);
      sfxMasterGain.connect(context.destination);

      const timelineCueTracks: TimelineCueTrack[] = [];
      timeline.cues.forEach((cue, index) => {
        const buffer = decodedSfxBuffers[index];
        if (!buffer) {
          return;
        }

        const panner = createPanner(context, cue.position_start);
        const gain = context.createGain();
        gain.gain.setValueAtTime(0, context.currentTime);

        panner.connect(gain);
        gain.connect(sfxMasterGain);

        timelineCueTracks.push({
          cue,
          buffer,
          gain,
          panner,
          playback: null,
        });
      });

      if (setupGeneration !== setupGenerationRef.current) {
        timelineCueTracks.forEach((cueTrack) => {
          cueTrack.gain.disconnect();
          cueTrack.panner.disconnect();
        });
        narratorSource.disconnect();
        narratorGain.disconnect();
        disposeAudioElement(narratorElement);
        sfxMasterGain.disconnect();
        return;
      }

      graphRef.current = {
        narrator: {
          element: narratorElement,
          source: narratorSource,
          gain: narratorGain,
        },
        sfxMasterGain,
        timelineCueTracks,
        timelineTotalDurationSeconds: timeline.total_duration_sec,
      };

      const syncDuration = () => {
        setDurationSeconds(readDuration(narratorElement) ?? 0);
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
        const graph = graphRef.current;
        const nextTime = readDuration(narratorElement) ?? narratorElement.currentTime;
        setCurrentTimeSeconds(nextTime);
        stopTimelineAnimation();
        isPlayingRef.current = false;

        if (graph) {
          stopAllCuePlayback(graph);
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
    [applyTimelineAtNarratorTime, ensureAudioContext, stopAllCuePlayback, stopTimelineAnimation, teardownGraph],
  );

  useEffect(() => {
    setError(null);

    if (!preparedAudio) {
      setupGenerationRef.current += 1;
      teardownGraph();
      return;
    }

    const currentGeneration = setupGenerationRef.current + 1;
    setupGenerationRef.current = currentGeneration;

    void setupGraph(preparedAudio, currentGeneration).catch((setupError) => {
      if (setupGenerationRef.current !== currentGeneration) {
        return;
      }
      setError(readErrorMessage(setupError, "Failed to initialize spatial audio."));
    });
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

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }

    applyTimelineAtNarratorTime(graph, graph.narrator.element.currentTime);
  }, [applyTimelineAtNarratorTime, sfxCueVolumes]);

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

    if (graph.narrator.element.ended) {
      graph.narrator.element.currentTime = 0;
    }

    await graph.narrator.element.play();
    isPlayingRef.current = true;

    applyTimelineAtNarratorTime(graph, graph.narrator.element.currentTime);

    if (graph.timelineCueTracks.length > 0) {
      startTimelineAnimation();
    }
  }, [applyTimelineAtNarratorTime, ensureAudioContext, startTimelineAnimation]);

  const pause = useCallback(async () => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }

    isPlayingRef.current = false;
    stopTimelineAnimation();
    stopAllCuePlayback(graph);
    graph.narrator.element.pause();

    const context = audioContextRef.current;
    if (context && context.state === "running") {
      await context.suspend();
    }
  }, [stopAllCuePlayback, stopTimelineAnimation]);

  const stop = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) {
      setCurrentTimeSeconds(0);
      return;
    }

    isPlayingRef.current = false;
    stopTimelineAnimation();
    stopAllCuePlayback(graph);
    graph.narrator.element.pause();
    graph.narrator.element.currentTime = 0;

    applyTimelineAtNarratorTime(graph, 0);
    setCurrentTimeSeconds(0);
  }, [applyTimelineAtNarratorTime, stopAllCuePlayback, stopTimelineAnimation]);

  const seek = useCallback(
    (timeSeconds: number) => {
      const graph = graphRef.current;
      if (!graph) {
        return;
      }

      const narratorDuration = readDuration(graph.narrator.element);
      const timelineTime = clampTimelineTime(timeSeconds, narratorDuration);
      graph.narrator.element.currentTime = timelineTime;

      if (isPlayingRef.current) {
        stopAllCuePlayback(graph);
      }

      applyTimelineAtNarratorTime(graph, timelineTime);
      setCurrentTimeSeconds(timelineTime);
    },
    [applyTimelineAtNarratorTime, stopAllCuePlayback],
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
