"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";

import { motion } from "framer-motion";
import Image from "next/image";

import { DreamControls } from "@/components/controls/dream-controls";
import { useDreamAudio } from "@/hooks/useDreamAudio";
import { useSpatialAudio } from "@/hooks/useSpatialAudio";
import { useGemini } from "@/hooks/useGemini";
import { useAudioStore } from "@/store/use-audio-store";

type DreamCanvasProps = {
  imageSrc?: string;
};

export function DreamCanvas({ imageSrc }: DreamCanvasProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedImageDataUrl, setUploadedImageDataUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>("Upload an image.");
  const [localError, setLocalError] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const { isAnalyzing, error, analyzeScene, clearAnalysis } = useGemini();
  const {
    isPreparingAudio,
    error: audioError,
    prepareAudio,
    clearPreparedAudio
  } = useDreamAudio();
  const preparedAudio = useAudioStore((state) => state.preparedAudio);
  const isPlaying = useAudioStore((state) => state.isPlaying);
  const setIsPlaying = useAudioStore((state) => state.setIsPlaying);
  const {
    play: playSpatialAudio,
    pause: pauseSpatialAudio,
    stop: stopSpatialAudio,
    error: spatialAudioError
  } = useSpatialAudio(preparedAudio);

  useEffect(() => {
    return () => {
      if (uploadedImageUrl) {
        URL.revokeObjectURL(uploadedImageUrl);
      }
    };
  }, [uploadedImageUrl]);

  useEffect(() => {
    setIsPlaying(false);
    setPlaybackError(null);
  }, [preparedAudio, setIsPlaying]);

  useEffect(() => {
    return stopSpatialAudio;
  }, [stopSpatialAudio]);

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
      stopSpatialAudio();
      setIsPlaying(false);
      setLocalError(null);
      setPlaybackError(null);
      setStatusMessage("Ready.");
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
      setStatusMessage("Upload an image.");
      return;
    }

    setLocalError(null);
    setPlaybackError(null);
    stopSpatialAudio();
    setIsPlaying(false);
    setStatusMessage("Analyzing...");

    try {
      const dreamAnalysis = await analyzeScene({ imageDataUrl: uploadedImageDataUrl });
      setStatusMessage("Generating audio...");
      const generatedAudio = await prepareAudio(dreamAnalysis);

      if (generatedAudio) {
        setStatusMessage("Ready to play.");
        return;
      }

      setStatusMessage("Audio not ready.");
    } catch {
      setStatusMessage(null);
    }
  };

  const handlePlayToggle = async () => {
    if (!preparedAudio) {
      setPlaybackError("Generate a dream first, then press Play.");
      setIsPlaying(false);
      return;
    }

    if (isPlaying) {
      try {
        await pauseSpatialAudio();
        setIsPlaying(false);
      } catch (pauseError) {
        const message =
          pauseError instanceof Error ? pauseError.message : "Failed to pause playback.";
        setPlaybackError(message);
      }
      return;
    }

    setPlaybackError(null);

    try {
      await playSpatialAudio();
      setIsPlaying(true);
    } catch (playError) {
      const message =
        playError instanceof Error ? playError.message : "Failed to start playback.";
      setPlaybackError(message);
      setIsPlaying(false);
    }
  };

  const activeImageSrc = uploadedImageUrl ?? imageSrc ?? null;
  const shouldRenderImage = activeImageSrc !== null;
  const isBlobImage = shouldRenderImage && activeImageSrc.startsWith("blob:");
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

      {shouldRenderImage ? (
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
      ) : (
        <div className="ambient-dream-bg absolute inset-0 overflow-hidden">
          <div className="ambient-orb ambient-orb-a" />
          <div className="ambient-orb ambient-orb-b" />
          <div className="ambient-orb ambient-orb-c" />
          <div className="ambient-orb ambient-orb-d" />
        </div>
      )}

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
          dreamError={
            localError ?? error ?? audioError ?? spatialAudioError ?? playbackError
          }
        />
      </motion.div>
    </section>
  );
}
