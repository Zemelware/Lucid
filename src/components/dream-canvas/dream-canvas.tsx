"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";

import { motion } from "framer-motion";
import Image from "next/image";

import { DreamControls } from "@/components/controls/dream-controls";
import { useGemini } from "@/hooks/useGemini";

type DreamCanvasProps = {
  imageSrc?: string;
};

export function DreamCanvas({ imageSrc = "/dream-placeholder.svg" }: DreamCanvasProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedImageDataUrl, setUploadedImageDataUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(
    "Upload an image to unlock Dream analysis."
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const { analysis, isAnalyzing, error, analyzeScene, clearAnalysis } = useGemini();

  useEffect(() => {
    return () => {
      if (uploadedImageUrl) {
        URL.revokeObjectURL(uploadedImageUrl);
      }
    };
  }, [uploadedImageUrl]);

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
      setLocalError(null);
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
    setStatusMessage("Dream guide is analyzing your scene...");

    try {
      await analyzeScene({ imageDataUrl: uploadedImageDataUrl });
      setStatusMessage("Dream scene generated.");
    } catch {
      setStatusMessage(null);
    }
  };

  const activeImageSrc = uploadedImageUrl ?? imageSrc;
  const isBlobImage = activeImageSrc.startsWith("blob:");
  const canDream = uploadedImageDataUrl !== null;

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
          isDreaming={isAnalyzing}
          canDream={canDream}
          statusMessage={statusMessage}
          dreamError={localError ?? error}
          narrative={analysis?.narrative ?? null}
        />
      </motion.div>
    </section>
  );
}
