"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  dreamscapeSnapshotRepository,
  type DreamscapeSnapshotRepository,
} from "@/devtools/dreamscape-snapshots/repository";
import {
  DREAMSCAPE_SNAPSHOT_IMAGE_DATA_URL,
  DREAMSCAPE_SNAPSHOT_IMAGE_REMOTE_URL,
  type DreamscapeSnapshotImage,
  type DreamscapeSnapshotListItem,
} from "@/devtools/dreamscape-snapshots/types";
import { detectClientPlatform } from "@/lib/client-platform";
import type { DreamAudioAssets, DreamSceneAnalysis } from "@/types/dream";

type LoadDreamscapeSnapshotPayload = {
  image: DreamscapeSnapshotImage;
  analysis: DreamSceneAnalysis;
  narratorBlob: Blob;
  sfxBlobs: Blob[];
};

type UseDreamscapeSnapshotsArgs = {
  enabled: boolean;
  activeImageSrc: string | null;
  preparedAudio: DreamAudioAssets | null;
  onLoadSnapshot: (payload: LoadDreamscapeSnapshotPayload) => Promise<void>;
  repository?: DreamscapeSnapshotRepository;
};

function isDataImageUrl(value: string): boolean {
  return /^data:image\//.test(value);
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//.test(value);
}

function readErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;
}

async function readBlobFromUrl(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch asset (${response.status}).`);
  }

  return response.blob();
}

function convertBlobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to convert image blob."));
    };
    reader.onerror = () => reject(new Error("Failed to convert image blob."));
    reader.readAsDataURL(blob);
  });
}

async function createSnapshotImageSource(activeImageSrc: string): Promise<DreamscapeSnapshotImage> {
  if (isDataImageUrl(activeImageSrc)) {
    return {
      kind: DREAMSCAPE_SNAPSHOT_IMAGE_DATA_URL,
      dataUrl: activeImageSrc,
    };
  }

  try {
    const imageBlob = await readBlobFromUrl(activeImageSrc);
    const dataUrl = await convertBlobToDataUrl(imageBlob);
    return {
      kind: DREAMSCAPE_SNAPSHOT_IMAGE_DATA_URL,
      dataUrl,
    };
  } catch (imageError) {
    if (isHttpUrl(activeImageSrc)) {
      return {
        kind: DREAMSCAPE_SNAPSHOT_IMAGE_REMOTE_URL,
        url: activeImageSrc,
      };
    }

    throw imageError;
  }
}

function createSnapshotLabel(): string {
  return `Dreamscape ${new Date().toLocaleString()}`;
}

export function useDreamscapeSnapshots({
  enabled,
  activeImageSrc,
  preparedAudio,
  onLoadSnapshot,
  repository = dreamscapeSnapshotRepository,
}: UseDreamscapeSnapshotsArgs) {
  const [snapshots, setSnapshots] = useState<DreamscapeSnapshotListItem[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const platform = useMemo(() => detectClientPlatform(), []);

  const refreshSnapshots = useCallback(async () => {
    if (!enabled) {
      setSnapshots([]);
      return;
    }

    setIsBusy(true);
    try {
      const records = await repository.list();
      setSnapshots(records.filter((item) => item.platform === platform));
    } catch (refreshError) {
      setError(readErrorMessage(refreshError, "Failed to load dreamscape snapshots."));
    } finally {
      setIsBusy(false);
    }
  }, [enabled, platform, repository]);

  useEffect(() => {
    void refreshSnapshots();
  }, [refreshSnapshots]);

  const saveSnapshot = useCallback(async () => {
    if (!enabled) {
      return;
    }

    if (!preparedAudio || !activeImageSrc) {
      setError("Generate a dream with image and audio before saving a snapshot.");
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      const image = await createSnapshotImageSource(activeImageSrc);
      const narratorBlob = await readBlobFromUrl(preparedAudio.narrator.blobUrl);
      const sfxBlobs = await Promise.all(
        preparedAudio.sfx.map(async (asset) => ({
          cueId: asset.cue.id,
          blob: await readBlobFromUrl(asset.blobUrl),
        })),
      );
      const analysis: DreamSceneAnalysis = {
        narrative: preparedAudio.narrator.text,
        timeline: preparedAudio.timeline,
      };

      await repository.save({
        label: createSnapshotLabel(),
        platform,
        image,
        analysis,
        narratorBlob,
        sfxBlobs,
      });

      await refreshSnapshots();
    } catch (saveError) {
      setError(readErrorMessage(saveError, "Failed to save dreamscape snapshot."));
    } finally {
      setIsBusy(false);
    }
  }, [activeImageSrc, enabled, platform, preparedAudio, refreshSnapshots, repository]);

  const loadSnapshot = useCallback(
    async (snapshotId: string) => {
      if (!enabled) {
        return;
      }

      setIsBusy(true);
      setError(null);

      try {
        const snapshot = await repository.get(snapshotId);
        if (!snapshot) {
          throw new Error("Dreamscape snapshot no longer exists.");
        }

        if (snapshot.platform !== platform) {
          throw new Error("Snapshot platform does not match this client.");
        }

        await onLoadSnapshot({
          image: snapshot.image,
          analysis: snapshot.analysis,
          narratorBlob: snapshot.narratorBlob,
          sfxBlobs: snapshot.sfxBlobs.map((entry) => entry.blob),
        });
      } catch (loadError) {
        setError(readErrorMessage(loadError, "Failed to load dreamscape snapshot."));
      } finally {
        setIsBusy(false);
      }
    },
    [enabled, onLoadSnapshot, platform, repository],
  );

  const deleteSnapshot = useCallback(
    async (snapshotId: string) => {
      if (!enabled) {
        return;
      }

      setIsBusy(true);
      setError(null);

      try {
        await repository.remove(snapshotId);
        await refreshSnapshots();
      } catch (deleteError) {
        setError(readErrorMessage(deleteError, "Failed to delete dreamscape snapshot."));
      } finally {
        setIsBusy(false);
      }
    },
    [enabled, refreshSnapshots, repository],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    enabled,
    snapshots,
    isBusy,
    error,
    saveSnapshot,
    loadSnapshot,
    deleteSnapshot,
    refreshSnapshots,
    clearError,
  };
}

export type { LoadDreamscapeSnapshotPayload };
