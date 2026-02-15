"use client";

import { useEffect, useState } from "react";

export type PanelTone = "light" | "dark";

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

export function usePanelTone(activeImageSrc: string | null): PanelTone {
  const [panelTone, setPanelTone] = useState<PanelTone>("light");

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
        const nextTone: PanelTone = luminance > 0.42 ? "dark" : "light";
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

  return panelTone;
}

