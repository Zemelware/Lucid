"use client";

import { useCallback, useState } from "react";

import { readApiErrorMessage } from "@/lib/api-client";
import { buildApiUrl } from "@/lib/runtime-api";
import { isRecord, readOptionalString } from "@/lib/validation";

type GenerateImageRequestBody = {
  prompt?: string;
  random?: boolean;
  isHighRes?: boolean;
};

export type GeneratedDreamImage = {
  imageUrl: string | null;
  imageDataUrl: string | null;
};
const GENERATE_SCENE_ERROR_FALLBACK = "Scene generation failed.";

function parseGeneratedDreamImage(value: unknown): GeneratedDreamImage {
  if (!isRecord(value)) {
    throw new Error("Invalid scene generation response.");
  }

  const imageUrl = readOptionalString(value.imageUrl);
  const imageDataUrl = readOptionalString(value.imageDataUrl);

  if (!imageUrl && !imageDataUrl) {
    throw new Error("Scene generation did not return an image.");
  }

  return {
    imageUrl,
    imageDataUrl,
  };
}

export function useDreamImage() {
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImage = useCallback(
    async (body: GenerateImageRequestBody): Promise<GeneratedDreamImage> => {
      setIsGeneratingImage(true);
      setError(null);

      try {
        const response = await fetch(buildApiUrl("/api/generate-image"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        const responseBody = (await response.json()) as unknown;

        if (!response.ok) {
          const message = readApiErrorMessage(responseBody, GENERATE_SCENE_ERROR_FALLBACK);
          setError(message);
          throw new Error(message);
        }

        return parseGeneratedDreamImage(responseBody);
      } catch (error) {
        const message =
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : GENERATE_SCENE_ERROR_FALLBACK;
        setError(message);
        throw error instanceof Error ? error : new Error(message);
      } finally {
        setIsGeneratingImage(false);
      }
    },
    [],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generateImage,
    isGeneratingImage,
    error,
    clearError,
  };
}
