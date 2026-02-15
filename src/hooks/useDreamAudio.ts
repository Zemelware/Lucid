"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { readApiErrorMessage } from "@/lib/api-client";
import { useAudioStore } from "@/store/use-audio-store";
import type { DreamAudioAssets, DreamSceneAnalysis } from "@/types/dream";

const AUDIO_ERROR_FALLBACK = "Audio request failed.";

async function getAudioBlob(
  endpoint: string,
  payload: Record<string, unknown>,
  signal: AbortSignal,
): Promise<Blob> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    let message = `Audio request failed (${response.status}).`;

    try {
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const body = (await response.json()) as unknown;
        message = readApiErrorMessage(body, AUDIO_ERROR_FALLBACK);
      } else {
        const bodyText = (await response.text()).trim();
        if (bodyText.length > 0) {
          message = bodyText;
        }
      }
    } catch {
      // Keep fallback message.
    }

    throw new Error(message);
  }

  return response.blob();
}

function disposeAudioElement(audio: HTMLAudioElement): void {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
}

function preloadAudioBlob(blobUrl: string): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();

    const cleanup = () => {
      audio.removeEventListener("canplaythrough", handleReady);
      audio.removeEventListener("loadeddata", handleReady);
      audio.removeEventListener("error", handleError);
      window.clearTimeout(timeoutId);
    };

    const handleReady = () => {
      cleanup();
      resolve(audio);
    };

    const handleError = () => {
      cleanup();
      reject(new Error("Failed to preload generated audio."));
    };

    const timeoutId = window.setTimeout(handleReady, 4000);

    audio.preload = "auto";
    audio.src = blobUrl;
    audio.addEventListener("canplaythrough", handleReady, { once: true });
    audio.addEventListener("loadeddata", handleReady, { once: true });
    audio.addEventListener("error", handleError, { once: true });
    audio.load();
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function useDreamAudio() {
  const [preparedAudio, setPreparedAudio] = useState<DreamAudioAssets | null>(null);
  const [isPreparingAudio, setIsPreparingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setPreparedAudioInStore = useAudioStore((state) => state.setPreparedAudio);
  const objectUrlsRef = useRef<string[]>([]);
  const preloadElementsRef = useRef<HTMLAudioElement[]>([]);
  const requestControllerRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);

  const releaseAudioCache = useCallback(() => {
    preloadElementsRef.current.forEach(disposeAudioElement);
    preloadElementsRef.current = [];

    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  }, []);

  const clearPreparedAudio = useCallback(() => {
    generationRef.current += 1;
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    releaseAudioCache();
    setPreparedAudio(null);
    setPreparedAudioInStore(null);
    setError(null);
    setIsPreparingAudio(false);
  }, [releaseAudioCache, setPreparedAudioInStore]);

  const prepareAudio = useCallback(
    async (analysis: DreamSceneAnalysis) => {
      generationRef.current += 1;
      const currentGeneration = generationRef.current;

      requestControllerRef.current?.abort();
      const controller = new AbortController();
      requestControllerRef.current = controller;

      releaseAudioCache();
      setPreparedAudio(null);
      setPreparedAudioInStore(null);
      setError(null);
      setIsPreparingAudio(true);

      let nextObjectUrls: string[] = [];
      let nextPreloadedElements: HTMLAudioElement[] = [];

      try {
        const timeline = analysis.timeline;
        if (!timeline || !Array.isArray(timeline.cues) || timeline.cues.length < 2) {
          throw new Error("Dream timeline is missing or invalid.");
        }

        const narratorPromise = getAudioBlob(
          "/api/generate-voice",
          {
            text: analysis.narrative,
          },
          controller.signal,
        );

        const sfxPromises = timeline.cues.map((cue) =>
          getAudioBlob(
            "/api/generate-sfx",
            {
              text: cue.prompt,
              loop: cue.loop,
              durationSeconds: cue.loop ? 12 : 6,
              promptInfluence: cue.loop ? 0.35 : 0.45,
            },
            controller.signal,
          ),
        );

        const [narratorBlob, ...sfxBlobs] = await Promise.all([narratorPromise, ...sfxPromises]);

        if (generationRef.current !== currentGeneration || controller.signal.aborted) {
          return null;
        }

        const narratorBlobUrl = URL.createObjectURL(narratorBlob);
        const sfxBlobUrls = sfxBlobs.map((blob) => URL.createObjectURL(blob));
        nextObjectUrls = [narratorBlobUrl, ...sfxBlobUrls];

        nextPreloadedElements = await Promise.all(
          nextObjectUrls.map((blobUrl) => preloadAudioBlob(blobUrl)),
        );

        if (generationRef.current !== currentGeneration || controller.signal.aborted) {
          nextPreloadedElements.forEach(disposeAudioElement);
          nextObjectUrls.forEach((url) => URL.revokeObjectURL(url));
          return null;
        }

        const sfxAssets = timeline.cues.map((cue, index) => ({
          blobUrl: sfxBlobUrls[index],
          cue,
        }));

        const nextPreparedAudio: DreamAudioAssets = {
          narrator: {
            blobUrl: narratorBlobUrl,
            text: analysis.narrative,
          },
          sfx: sfxAssets,
          timeline,
        };

        objectUrlsRef.current = nextObjectUrls;
        preloadElementsRef.current = nextPreloadedElements;
        setPreparedAudio(nextPreparedAudio);
        setPreparedAudioInStore(nextPreparedAudio);

        return nextPreparedAudio;
      } catch (audioError) {
        nextPreloadedElements.forEach(disposeAudioElement);
        nextObjectUrls.forEach((url) => URL.revokeObjectURL(url));

        if (
          generationRef.current !== currentGeneration ||
          controller.signal.aborted ||
          isAbortError(audioError)
        ) {
          return null;
        }

        const message =
          audioError instanceof Error ? audioError.message : "Failed to generate dream audio.";
        setError(message);
        return null;
      } finally {
        if (generationRef.current === currentGeneration) {
          setIsPreparingAudio(false);
          requestControllerRef.current = null;
        }
      }
    },
    [releaseAudioCache, setPreparedAudioInStore],
  );

  useEffect(() => clearPreparedAudio, [clearPreparedAudio]);

  return {
    preparedAudio,
    isPreparingAudio,
    error,
    prepareAudio,
    clearPreparedAudio,
  };
}
