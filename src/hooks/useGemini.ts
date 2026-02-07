"use client";

import { useCallback, useState } from "react";

import type { DreamSceneAnalysis } from "@/types/dream";

type AnalyzeScenePayload =
  | {
      imageUrl: string;
      imageDataUrl?: never;
    }
  | {
      imageDataUrl: string;
      imageUrl?: never;
    };

type ApiErrorBody = {
  error?: string;
};

function getErrorMessage(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as ApiErrorBody).error === "string"
  ) {
    return (value as ApiErrorBody).error ?? "Request failed.";
  }

  return "Request failed.";
}

export function useGemini() {
  const [analysis, setAnalysis] = useState<DreamSceneAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeScene = useCallback(async (payload: AnalyzeScenePayload) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze-scene", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const responseBody = (await response.json()) as unknown;

      if (!response.ok) {
        const message = getErrorMessage(responseBody);
        setError(message);
        throw new Error(message);
      }

      const dreamAnalysis = responseBody as DreamSceneAnalysis;
      setAnalysis(dreamAnalysis);
      return dreamAnalysis;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  return {
    analysis,
    isAnalyzing,
    error,
    analyzeScene,
    clearAnalysis
  };
}
