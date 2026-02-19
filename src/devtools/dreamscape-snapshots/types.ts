import type { ClientPlatform } from "@/lib/client-platform";
import type { DreamSceneAnalysis } from "@/types/dream";

export const DREAMSCAPE_SNAPSHOT_IMAGE_DATA_URL = "data-url";
export const DREAMSCAPE_SNAPSHOT_IMAGE_REMOTE_URL = "remote-url";

type DreamscapeSnapshotImageDataUrl = {
  kind: typeof DREAMSCAPE_SNAPSHOT_IMAGE_DATA_URL;
  dataUrl: string;
};

type DreamscapeSnapshotImageRemoteUrl = {
  kind: typeof DREAMSCAPE_SNAPSHOT_IMAGE_REMOTE_URL;
  url: string;
};

export type DreamscapeSnapshotImage =
  | DreamscapeSnapshotImageDataUrl
  | DreamscapeSnapshotImageRemoteUrl;

export type DreamscapeSnapshotSfxBlob = {
  cueId: string;
  blob: Blob;
};

export type DreamscapeSnapshotRecord = {
  id: string;
  label: string;
  createdAt: string;
  platform: ClientPlatform;
  image: DreamscapeSnapshotImage;
  analysis: DreamSceneAnalysis;
  narratorBlob: Blob;
  sfxBlobs: DreamscapeSnapshotSfxBlob[];
};

export type CreateDreamscapeSnapshotInput = {
  label: string;
  platform: ClientPlatform;
  image: DreamscapeSnapshotImage;
  analysis: DreamSceneAnalysis;
  narratorBlob: Blob;
  sfxBlobs: DreamscapeSnapshotSfxBlob[];
};

export type DreamscapeSnapshotListItem = {
  id: string;
  label: string;
  createdAt: string;
  platform: ClientPlatform;
};
