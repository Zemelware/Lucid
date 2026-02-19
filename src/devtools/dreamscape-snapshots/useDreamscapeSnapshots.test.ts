import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDreamscapeSnapshots } from "@/devtools/dreamscape-snapshots/useDreamscapeSnapshots";
import type { DreamscapeSnapshotRepository } from "@/devtools/dreamscape-snapshots/repository";
import {
  DREAMSCAPE_SNAPSHOT_IMAGE_DATA_URL,
  type DreamscapeSnapshotRecord,
} from "@/devtools/dreamscape-snapshots/types";
import type { DreamAudioAssets } from "@/types/dream";

const SAMPLE_PREPARED_AUDIO: DreamAudioAssets = {
  narrator: {
    blobUrl: "blob:narrator",
    text: "you drift through quiet rain while the room breathes around you.",
  },
  timeline: {
    total_duration_sec: 60,
    cues: [
      {
        id: "rain",
        prompt: "rain",
        loop: true,
        volume: 0.8,
        start_sec: 0,
        end_sec: 25,
        position_start: { x: -3, y: 0, z: -1 },
        position_end: { x: -2, y: 0, z: -1 },
      },
      {
        id: "wind",
        prompt: "wind",
        loop: false,
        volume: 0.5,
        start_sec: 20,
        end_sec: 45,
        position_start: { x: 2, y: 0, z: 2 },
        position_end: { x: 4, y: 0, z: 3 },
      },
    ],
  },
  sfx: [
    {
      blobUrl: "blob:rain",
      cue: {
        id: "rain",
        prompt: "rain",
        loop: true,
        volume: 0.8,
        start_sec: 0,
        end_sec: 25,
        position_start: { x: -3, y: 0, z: -1 },
        position_end: { x: -2, y: 0, z: -1 },
      },
    },
    {
      blobUrl: "blob:wind",
      cue: {
        id: "wind",
        prompt: "wind",
        loop: false,
        volume: 0.5,
        start_sec: 20,
        end_sec: 45,
        position_start: { x: 2, y: 0, z: 2 },
        position_end: { x: 4, y: 0, z: 3 },
      },
    },
  ],
};

function createMockRepository(): DreamscapeSnapshotRepository {
  return {
    list: vi.fn(async () => []),
    get: vi.fn(async () => null),
    save: vi.fn(async (input) => ({
      id: "snapshot-1",
      createdAt: "2026-02-18T12:00:00.000Z",
      ...input,
    })),
    remove: vi.fn(async () => undefined),
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useDreamscapeSnapshots", () => {
  it("filters snapshot list to the active platform", async () => {
    const repository = createMockRepository();
    vi.mocked(repository.list).mockResolvedValue([
      {
        id: "web-1",
        label: "Web Snapshot",
        createdAt: "2026-02-18T12:00:00.000Z",
        platform: "web",
      },
      {
        id: "mobile-1",
        label: "Mobile Snapshot",
        createdAt: "2026-02-18T11:00:00.000Z",
        platform: "mobile",
      },
    ]);

    const { result } = renderHook(() =>
      useDreamscapeSnapshots({
        enabled: true,
        activeImageSrc: "data:image/png;base64,AAA",
        preparedAudio: SAMPLE_PREPARED_AUDIO,
        onLoadSnapshot: vi.fn(async () => undefined),
        repository,
      }),
    );

    await waitFor(() => {
      expect(result.current.snapshots).toHaveLength(1);
      expect(result.current.snapshots[0]?.id).toBe("web-1");
    });
  });

  it("saves the current prepared dreamscape as a snapshot", async () => {
    const repository = createMockRepository();
    const narratorBlob = new Blob(["narrator"], { type: "audio/mpeg" });
    const rainBlob = new Blob(["rain"], { type: "audio/mpeg" });
    const windBlob = new Blob(["wind"], { type: "audio/mpeg" });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "blob:narrator") {
          return new Response(narratorBlob);
        }
        if (url === "blob:rain") {
          return new Response(rainBlob);
        }
        if (url === "blob:wind") {
          return new Response(windBlob);
        }

        return new Response(null, { status: 404 });
      }),
    );

    const { result } = renderHook(() =>
      useDreamscapeSnapshots({
        enabled: true,
        activeImageSrc: "data:image/png;base64,AAA",
        preparedAudio: SAMPLE_PREPARED_AUDIO,
        onLoadSnapshot: vi.fn(async () => undefined),
        repository,
      }),
    );

    await act(async () => {
      await result.current.saveSnapshot();
    });

    expect(repository.save).toHaveBeenCalledTimes(1);
    const saveCall = vi.mocked(repository.save).mock.calls[0]?.[0];
    expect(saveCall?.platform).toBe("web");
    expect(saveCall?.image).toEqual({
      kind: DREAMSCAPE_SNAPSHOT_IMAGE_DATA_URL,
      dataUrl: "data:image/png;base64,AAA",
    });
    expect(saveCall?.analysis.narrative).toBe(SAMPLE_PREPARED_AUDIO.narrator.text);
    expect(saveCall?.sfxBlobs).toHaveLength(2);
  });

  it("loads a saved snapshot and passes it to the consumer callback", async () => {
    const repository = createMockRepository();
    const onLoadSnapshot = vi.fn(async () => undefined);
    const snapshot: DreamscapeSnapshotRecord = {
      id: "snapshot-1",
      label: "Saved Dream",
      createdAt: "2026-02-18T12:00:00.000Z",
      platform: "web",
      image: {
        kind: DREAMSCAPE_SNAPSHOT_IMAGE_DATA_URL,
        dataUrl: "data:image/png;base64,AAA",
      },
      analysis: {
        narrative: SAMPLE_PREPARED_AUDIO.narrator.text,
        timeline: SAMPLE_PREPARED_AUDIO.timeline,
      },
      narratorBlob: new Blob(["narrator"], { type: "audio/mpeg" }),
      sfxBlobs: [
        { cueId: "rain", blob: new Blob(["rain"], { type: "audio/mpeg" }) },
        { cueId: "wind", blob: new Blob(["wind"], { type: "audio/mpeg" }) },
      ],
    };

    vi.mocked(repository.get).mockResolvedValue(snapshot);

    const { result } = renderHook(() =>
      useDreamscapeSnapshots({
        enabled: true,
        activeImageSrc: "data:image/png;base64,AAA",
        preparedAudio: SAMPLE_PREPARED_AUDIO,
        onLoadSnapshot,
        repository,
      }),
    );

    await act(async () => {
      await result.current.loadSnapshot("snapshot-1");
    });

    expect(onLoadSnapshot).toHaveBeenCalledTimes(1);
    expect(onLoadSnapshot).toHaveBeenCalledWith({
      image: snapshot.image,
      analysis: snapshot.analysis,
      narratorBlob: snapshot.narratorBlob,
      sfxBlobs: snapshot.sfxBlobs.map((entry) => entry.blob),
    });
  });
});
