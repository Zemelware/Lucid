"use client";

import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";

import { motion } from "framer-motion";
import Image from "next/image";

import { DreamControls } from "@/components/controls/dream-controls";
import { useDreamAudio } from "@/hooks/useDreamAudio";
import { useGemini } from "@/hooks/useGemini";
import { useAudioStore } from "@/store/use-audio-store";

type DreamCanvasProps = {
  imageSrc?: string;
};

type PlaybackElements = {
  narrator: HTMLAudioElement;
  sfx: HTMLAudioElement[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function disposeAudioElement(audio: HTMLAudioElement): void {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
}

export function DreamCanvas({ imageSrc = "/dream-placeholder.svg" }: DreamCanvasProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playbackRef = useRef<PlaybackElements | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedImageDataUrl, setUploadedImageDataUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(
    "Upload an image to unlock Dream analysis."
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const { analysis, isAnalyzing, error, analyzeScene, clearAnalysis } = useGemini();
  const {
    isPreparingAudio,
    error: audioError,
    prepareAudio,
    clearPreparedAudio
  } = useDreamAudio();
  const preparedAudio = useAudioStore((state) => state.preparedAudio);
  const isPlaying = useAudioStore((state) => state.isPlaying);
  const setIsPlaying = useAudioStore((state) => state.setIsPlaying);

  useEffect(() => {
    return () => {
      if (uploadedImageUrl) {
        URL.revokeObjectURL(uploadedImageUrl);
      }
    };
  }, [uploadedImageUrl]);

  const stopPlayback = useCallback(() => {
    const playback = playbackRef.current;
    if (!playback) {
      return;
    }

    disposeAudioElement(playback.narrator);
    playback.sfx.forEach(disposeAudioElement);
    playbackRef.current = null;
  }, []);

  useEffect(() => {
    stopPlayback();
    setIsPlaying(false);
    setPlaybackError(null);

    if (!preparedAudio) {
      return;
    }

    const narrator = new Audio(preparedAudio.narrator.blobUrl);
    narrator.preload = "auto";
    narrator.volume = 1;

    const sfx = preparedAudio.sfx.map(({ blobUrl, cue }) => {
      const audio = new Audio(blobUrl);
      audio.preload = "auto";
      audio.loop = cue.loop;
      audio.volume = clamp(cue.volume, 0, 1);
      return audio;
    });

    playbackRef.current = { narrator, sfx };
  }, [preparedAudio, setIsPlaying, stopPlayback]);

  useEffect(() => {
    return stopPlayback;
  }, [stopPlayback]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }
        reject(new Error("Unable to read image data."));
      };
      reader.onerror = () => reject(new Error("Unable to read image data."));
      reader.readAsDataURL(file);
    });

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setUploadedImageDataUrl(dataUrl);
      setUploadedImageUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }

        return URL.createObjectURL(file);
      });
      clearAnalysis();
      clearPreparedAudio();
      stopPlayback();
      setIsPlaying(false);
      setLocalError(null);
      setPlaybackError(null);
      setStatusMessage("Image ready. Click Dream.");
    } catch (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : "Image upload failed.";
      setLocalError(message);
      setStatusMessage(null);
    }

    input.value = "";
  };

  const handleDreamClick = async () => {
    if (!uploadedImageDataUrl) {
      setLocalError("Upload an image before you click Dream.");
      setStatusMessage("Lucid needs an uploaded image for scene analysis.");
      return;
    }

    setLocalError(null);
    setPlaybackError(null);
    setIsPlaying(false);
    setStatusMessage("Dream guide is analyzing your scene...");

    try {
      const dreamAnalysis = await analyzeScene({ imageDataUrl: uploadedImageDataUrl });
      setStatusMessage("Dream scene generated. Synthesizing voice and ambient sound...");
      const generatedAudio = await prepareAudio(dreamAnalysis);

      if (generatedAudio) {
        setStatusMessage(
          "Dream audio preloaded and ready. Press Play for an instant start."
        );
        return;
      }

      setStatusMessage("Dream scene generated, but audio is not ready yet.");
    } catch {
      setStatusMessage(null);
    }
  };

  const handlePlayToggle = async () => {
    const playback = playbackRef.current;

    if (!playback || !preparedAudio) {
      setPlaybackError("Generate a dream first, then press Play.");
      setIsPlaying(false);
      return;
    }

    if (isPlaying) {
      playback.narrator.pause();
      playback.sfx.forEach((audio) => audio.pause());
      setIsPlaying(false);
      return;
    }

    setPlaybackError(null);

    if (playback.narrator.ended) {
      playback.narrator.currentTime = 0;
    }

    playback.sfx.forEach((audio) => {
      if (audio.ended) {
        audio.currentTime = 0;
      }
    });

    try {
      await Promise.all([playback.narrator.play(), ...playback.sfx.map((audio) => audio.play())]);
      setIsPlaying(true);
    } catch (playError) {
      const message =
        playError instanceof Error ? playError.message : "Failed to start playback.";
      setPlaybackError(message);
      setIsPlaying(false);
    }
  };

  const activeImageSrc = uploadedImageUrl ?? imageSrc;
  const isBlobImage = activeImageSrc.startsWith("blob:");
  const canDream = uploadedImageDataUrl !== null;
  const canPlayAudio = preparedAudio !== null && !isPreparingAudio;

  return (
    <section className="relative h-full w-full overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageChange}
      />

      <div className="dream-breath absolute inset-0 will-change-transform">
        <Image
          src={activeImageSrc}
          alt="Liminal dreamscape"
          fill
          priority
          sizes="100vw"
          unoptimized={isBlobImage}
          className="object-cover"
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/45 via-slate-950/35 to-slate-950/80" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        className="relative z-10 flex h-full w-full items-end justify-center p-6 sm:p-10"
      >
        <DreamControls
          onUploadClick={handleUploadClick}
          onDreamClick={handleDreamClick}
          onPlayToggle={() => {
            void handlePlayToggle();
          }}
          isDreaming={isAnalyzing || isPreparingAudio}
          isPlaying={isPlaying}
          canDream={canDream}
          canPlayAudio={canPlayAudio}
          statusMessage={statusMessage}
          dreamError={localError ?? error ?? audioError ?? playbackError}
          narrative={analysis?.narrative ?? null}
        />
      </motion.div>
    </section>
  );
}
