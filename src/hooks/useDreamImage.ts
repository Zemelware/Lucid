"use client";

import { useCallback, useState } from "react";

type GenerateImageRequestBody = {
  prompt?: string;
  random?: boolean;
  isHighRes?: boolean;
};

export type GeneratedDreamImage = {
  imageUrl: string | null;
  imageDataUrl: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(value: unknown): string {
  if (isRecord(value) && typeof value.error === "string" && value.error.trim().length > 0) {
    return value.error;
  }

  return "Scene generation failed.";
}

function readOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

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
        const response = await fetch("/api/generate-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        const responseBody = (await response.json()) as unknown;

        if (!response.ok) {
          const message = getErrorMessage(responseBody);
          setError(message);
          throw new Error(message);
        }

        return parseGeneratedDreamImage(responseBody);
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
