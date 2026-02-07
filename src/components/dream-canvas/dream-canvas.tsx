"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";

import { motion } from "framer-motion";
import { Brain, Volume2 } from "lucide-react";
import Image from "next/image";

import { DreamControls } from "@/components/controls/dream-controls";
import { useDreamAudio } from "@/hooks/useDreamAudio";
import { useDreamImage } from "@/hooks/useDreamImage";
import { useSpatialAudio } from "@/hooks/useSpatialAudio";
import { useGemini } from "@/hooks/useGemini";
import { useAudioStore } from "@/store/use-audio-store";
import { useSettingsStore } from "@/store/use-settings-store";

type DreamCanvasProps = {
  imageSrc?: string;
};

function calculateAverageLuminance(data: Uint8ClampedArray): number {
  let totalLuminance = 0;
  const pixelCount = data.length / 4;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index] / 255;
    const green = data[index + 1] / 255;
    const blue = data[index + 2] / 255;
    totalLuminance += 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  }

  if (pixelCount === 0) {
    return 0;
  }

  return totalLuminance / pixelCount;
}

export function DreamCanvas({ imageSrc }: DreamCanvasProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedImageDataUrl, setUploadedImageDataUrl] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedImageDataUrl, setGeneratedImageDataUrl] = useState<string | null>(null);
  const [scenePrompt, setScenePrompt] = useState("");
  const [panelTone, setPanelTone] = useState<"light" | "dark">("light");
  const [localError, setLocalError] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const { isAnalyzing, error, analyzeScene, clearAnalysis } = useGemini();
  const {
    isGeneratingImage,
    error: imageGenerationError,
    generateImage,
    clearError: clearImageGenerationError,
  } = useDreamImage();
  const { isPreparingAudio, error: audioError, prepareAudio, clearPreparedAudio } = useDreamAudio();
  const preparedAudio = useAudioStore((state) => state.preparedAudio);
  const isPlaying = useAudioStore((state) => state.isPlaying);
  const setIsPlaying = useAudioStore((state) => state.setIsPlaying);
  const isHighRes = useSettingsStore((state) => state.isHighRes);
  const setIsHighRes = useSettingsStore((state) => state.setIsHighRes);
  const sfxVolume = useSettingsStore((state) => state.sfxVolume);
  const setSfxVolume = useSettingsStore((state) => state.setSfxVolume);
  const {
    play: playSpatialAudio,
    pause: pauseSpatialAudio,
    stop: stopSpatialAudio,
    seek: seekSpatialAudio,
    currentTimeSeconds,
    durationSeconds,
    error: spatialAudioError,
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

  useEffect(() => {
    if (!isPlaying || durationSeconds <= 0) {
      return;
    }

    if (currentTimeSeconds >= durationSeconds - 0.05) {
      setIsPlaying(false);
    }
  }, [currentTimeSeconds, durationSeconds, isPlaying, setIsPlaying]);

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
      setGeneratedImageUrl(null);
      setGeneratedImageDataUrl(null);
      clearAnalysis();
      clearPreparedAudio();
      clearImageGenerationError();
      stopSpatialAudio();
      setIsPlaying(false);
      setLocalError(null);
      setPlaybackError(null);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Image upload failed.";
      setLocalError(message);
    }

    input.value = "";
  };

  const handleCreateSceneClick = async () => {
    const trimmedPrompt = scenePrompt.trim();
    if (trimmedPrompt.length === 0) {
      setLocalError("Enter a scene prompt or use the dice button for a random scene.");
      return;
    }

    setLocalError(null);
    setPlaybackError(null);
    clearImageGenerationError();
    stopSpatialAudio();
    setIsPlaying(false);

    try {
      const generatedScene = await generateImage({
        prompt: trimmedPrompt,
        random: false,
        isHighRes,
      });

      setUploadedImageDataUrl(null);
      setUploadedImageUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }

        return null;
      });
      setGeneratedImageUrl(generatedScene.imageUrl);
      setGeneratedImageDataUrl(generatedScene.imageDataUrl);

      clearAnalysis();
      clearPreparedAudio();
    } catch {}
  };

  const handleRandomSceneClick = async () => {
    setLocalError(null);
    setPlaybackError(null);
    clearImageGenerationError();
    stopSpatialAudio();
    setIsPlaying(false);

    try {
      const generatedScene = await generateImage({ random: true, isHighRes });

      setUploadedImageDataUrl(null);
      setUploadedImageUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }

        return null;
      });
      setGeneratedImageUrl(generatedScene.imageUrl);
      setGeneratedImageDataUrl(generatedScene.imageDataUrl);

      clearAnalysis();
      clearPreparedAudio();
    } catch {}
  };

  const handleDreamClick = async () => {
    const imagePayload = uploadedImageDataUrl
      ? { imageDataUrl: uploadedImageDataUrl }
      : generatedImageDataUrl
        ? { imageDataUrl: generatedImageDataUrl }
        : generatedImageUrl
          ? { imageUrl: generatedImageUrl }
          : null;

    if (!imagePayload) {
      setLocalError("Upload an image or create a scene before you click Dream.");
      return;
    }

    setLocalError(null);
    setPlaybackError(null);
    stopSpatialAudio();
    setIsPlaying(false);

    try {
      const dreamAnalysis = await analyzeScene(imagePayload);
      await prepareAudio(dreamAnalysis);
    } catch {}
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
      const message = playError instanceof Error ? playError.message : "Failed to start playback.";
      setPlaybackError(message);
      setIsPlaying(false);
    }
  };

  const handlePlaybackSeek = (nextSeconds: number) => {
    if (!preparedAudio) {
      return;
    }

    setPlaybackError(null);
    seekSpatialAudio(nextSeconds);

    if (durationSeconds > 0 && nextSeconds >= durationSeconds) {
      setIsPlaying(false);
    }
  };

  const activeImageSrc =
    uploadedImageUrl ?? generatedImageDataUrl ?? generatedImageUrl ?? imageSrc ?? null;
  const shouldRenderImage = activeImageSrc !== null;
  const canDream =
    uploadedImageDataUrl !== null || generatedImageDataUrl !== null || generatedImageUrl !== null;
  const canCreateScene =
    scenePrompt.trim().length > 0 && !isAnalyzing && !isPreparingAudio && !isGeneratingImage;
  const canRandomScene = !isAnalyzing && !isPreparingAudio && !isGeneratingImage;
  const showPlaybackControls = preparedAudio !== null;
  const canPlayAudio =
    preparedAudio !== null && !isPreparingAudio && !isGeneratingImage && !isAnalyzing;
  const canSeekAudio = canPlayAudio && durationSeconds > 0;

  useEffect(() => {
    if (!activeImageSrc) {
      setPanelTone("light");
      return;
    }

    let didCancel = false;
    const sampleImage = new window.Image();
    sampleImage.decoding = "async";
    sampleImage.crossOrigin = "anonymous";

    const onLoad = () => {
      if (didCancel) {
        return;
      }

      try {
        const canvas = document.createElement("canvas");
        const sampleSize = 96;
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        const context = canvas.getContext("2d");
        if (!context) {
          setPanelTone("light");
          return;
        }

        context.drawImage(sampleImage, 0, 0, sampleSize, sampleSize);
        const regionStartX = Math.floor(sampleSize * 0.3);
        const regionStartY = Math.floor(sampleSize * 0.68);
        const regionWidth = Math.floor(sampleSize * 0.4);
        const regionHeight = Math.floor(sampleSize * 0.28);
        const regionImageData = context.getImageData(
          regionStartX,
          regionStartY,
          regionWidth,
          regionHeight,
        );
        const luminance = calculateAverageLuminance(regionImageData.data);
        const nextTone = luminance > 0.56 ? "dark" : "light";
        setPanelTone(nextTone);
      } catch {
        setPanelTone("light");
      }
    };

    const onError = () => {
      if (!didCancel) {
        setPanelTone("light");
      }
    };

    sampleImage.addEventListener("load", onLoad);
    sampleImage.addEventListener("error", onError);
    sampleImage.src = activeImageSrc;

    return () => {
      didCancel = true;
      sampleImage.removeEventListener("load", onLoad);
      sampleImage.removeEventListener("error", onError);
    };
  }, [activeImageSrc]);

  return (
    <section className="relative h-full w-full overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageChange}
      />

      {/* Settings Toggle (Top Left) */}
      <div className="absolute left-6 top-6 z-20">
        <button
          onClick={() => setIsHighRes(!isHighRes)}
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-md transition-all sm:px-4 sm:py-2 sm:text-sm ${
            isHighRes
              ? "border-amber-200/50 bg-amber-500/20 text-amber-50 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
              : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Brain
            className={`size-3 transition-transform sm:size-4 ${isHighRes ? "scale-110 fill-amber-300" : ""}`}
          />
          <span className="tracking-wide">{isHighRes ? "NANO BANANA PRO" : "NANO BANANA"}</span>
        </button>
      </div>

      {/* SFX Volume Control (Top Right) */}
      <div className="absolute right-6 top-6 z-20 flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md transition-all sm:px-4 sm:py-2">
          <Volume2 className="size-3 text-white/50 sm:size-4" aria-hidden="true" />
          <input
            type="range"
            min={0}
            max={3}
            step={0.05}
            value={sfxVolume}
            onChange={(event) => setSfxVolume(Number(event.currentTarget.value))}
            className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/20 accent-indigo-300 sm:w-28"
            aria-label="Sound effects volume"
          />
        </div>
        <span className="mr-1.5 text-[10px] font-bold text-indigo-100/70 uppercase tracking-[0.25em]">
          SFX Boost
        </span>
      </div>

      {shouldRenderImage ? (
        <div className="dream-breath absolute inset-0 will-change-transform">
          <Image
            src={activeImageSrc}
            alt="Liminal dreamscape"
            fill
            priority
            sizes="100vw"
            unoptimized
            loader={({ src }) => src}
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
          onCreateSceneClick={() => {
            void handleCreateSceneClick();
          }}
          onRandomSceneClick={() => {
            void handleRandomSceneClick();
          }}
          onScenePromptChange={setScenePrompt}
          onDreamClick={handleDreamClick}
          onPlayToggle={() => {
            void handlePlayToggle();
          }}
          onPlaybackSeek={handlePlaybackSeek}
          scenePrompt={scenePrompt}
          isGeneratingScene={isGeneratingImage}
          isDreaming={isAnalyzing || isPreparingAudio}
          isPlaying={isPlaying}
          canCreateScene={canCreateScene}
          canRandomScene={canRandomScene}
          canDream={canDream}
          canPlayAudio={canPlayAudio}
          canSeekAudio={canSeekAudio}
          showPlaybackControls={showPlaybackControls}
          playbackTimeSeconds={currentTimeSeconds}
          playbackDurationSeconds={durationSeconds}
          panelTone={panelTone}
          dreamError={
            localError ??
            imageGenerationError ??
            error ??
            audioError ??
            spatialAudioError ??
            playbackError
          }
        />
      </motion.div>
    </section>
  );
}
