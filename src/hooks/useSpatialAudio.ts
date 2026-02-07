"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { DreamAudioAssets, SfxCue } from "@/types/dream";

type SpatialTrack = {
  element: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  panner?: PannerNode;
};

type SpatialGraph = {
  narrator: SpatialTrack;
  sfx: [SpatialTrack, SpatialTrack, SpatialTrack];
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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

function createPanner(context: AudioContext, cue: SfxCue): PannerNode {
  const panner = new PannerNode(context, {
    panningModel: "HRTF",
    distanceModel: "inverse",
    refDistance: 1,
    maxDistance: 30,
    rolloffFactor: 1,
    coneInnerAngle: 360,
    coneOuterAngle: 360,
    coneOuterGain: 1
  });

  const x = toAudioUnits(cue.position_3d.x);
  const y = toAudioUnits(cue.position_3d.y);
  const z = mapSceneDepthToPannerZ(cue.position_3d.z);

  panner.positionX.setValueAtTime(x, context.currentTime);
  panner.positionY.setValueAtTime(y, context.currentTime);
  panner.positionZ.setValueAtTime(z, context.currentTime);

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
  blobUrl: string,
  cue: SfxCue
): SpatialTrack {
  const element = createAudioElement(blobUrl, cue.loop);
  const source = context.createMediaElementSource(element);
  const panner = createPanner(context, cue);
  const gain = context.createGain();
  gain.gain.setValueAtTime(clamp(cue.volume, 0, 1), context.currentTime);

  source.connect(panner);
  panner.connect(gain);
  gain.connect(context.destination);

  return { element, source, panner, gain };
}

type SpatialAudioHook = {
  error: string | null;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => void;
};

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export function useSpatialAudio(preparedAudio: DreamAudioAssets | null): SpatialAudioHook {
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const graphRef = useRef<SpatialGraph | null>(null);

  const ensureAudioContext = useCallback((): AudioContext => {
    if (audioContextRef.current) {
      return audioContextRef.current;
    }

    const AudioContextCtor =
      window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!AudioContextCtor) {
      throw new Error("Web Audio is not supported in this browser.");
    }

    const context = new AudioContextCtor();
    audioContextRef.current = context;
    return context;
  }, []);

  const teardownGraph = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }

    const tracks = [graph.narrator, ...graph.sfx];
    tracks.forEach((track) => {
      track.source.disconnect();
      track.gain.disconnect();
      track.panner?.disconnect();
      disposeAudioElement(track.element);
    });

    graphRef.current = null;
  }, []);

  const setupGraph = useCallback(
    (assets: DreamAudioAssets) => {
      const context = ensureAudioContext();

      teardownGraph();

      const narratorElement = createAudioElement(assets.narrator.blobUrl, false);
      const narratorSource = context.createMediaElementSource(narratorElement);
      const narratorGain = context.createGain();
      narratorGain.gain.setValueAtTime(1.05, context.currentTime);
      narratorSource.connect(narratorGain);
      narratorGain.connect(context.destination);

      const sfxTracks = assets.sfx.map((asset) =>
        createSfxTrack(context, asset.blobUrl, asset.cue)
      ) as [SpatialTrack, SpatialTrack, SpatialTrack];

      graphRef.current = {
        narrator: {
          element: narratorElement,
          source: narratorSource,
          gain: narratorGain
        },
        sfx: sfxTracks
      };
    },
    [ensureAudioContext, teardownGraph]
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
  }, [ensureAudioContext]);

  const pause = useCallback(async () => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }

    [graph.narrator.element, ...graph.sfx.map((track) => track.element)].forEach(
      (element) => {
        element.pause();
      }
    );

    const context = audioContextRef.current;
    if (context && context.state === "running") {
      await context.suspend();
    }
  }, []);

  const stop = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }

    [graph.narrator.element, ...graph.sfx.map((track) => track.element)].forEach(
      (element) => {
        element.pause();
        element.currentTime = 0;
      }
    );
  }, []);

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
    stop
  };
}
