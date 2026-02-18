"use client";

import { useCallback, useState } from "react";

import { readApiErrorMessage } from "@/lib/api-client";
import { buildApiUrl } from "@/lib/runtime-api";
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

const ANALYZE_ERROR_FALLBACK = "Request failed.";

export function useSceneAnalysis() {
  const [analysis, setAnalysis] = useState<DreamSceneAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeScene = useCallback(async (payload: AnalyzeScenePayload) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl("/api/analyze-scene"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const responseBody = (await response.json()) as unknown;

      if (!response.ok) {
        const message = readApiErrorMessage(responseBody, ANALYZE_ERROR_FALLBACK);
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
