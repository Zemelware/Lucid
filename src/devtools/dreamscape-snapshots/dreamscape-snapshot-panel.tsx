"use client";

import { useEffect, useMemo, useState } from "react";

import type { DreamscapeSnapshotListItem } from "@/devtools/dreamscape-snapshots/types";

type DreamscapeSnapshotPanelProps = {
  snapshots: DreamscapeSnapshotListItem[];
  isBusy: boolean;
  error: string | null;
  canSave: boolean;
  onSave: () => void;
  onLoad: (snapshotId: string) => void;
  onDelete: (snapshotId: string) => void;
};

function formatCreatedAt(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.valueOf())) {
    return timestamp;
  }

  return parsed.toLocaleString();
}

export function DreamscapeSnapshotPanel({
  snapshots,
  isBusy,
  error,
  canSave,
  onSave,
  onLoad,
  onDelete,
}: DreamscapeSnapshotPanelProps) {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>("");

  useEffect(() => {
    if (snapshots.length === 0) {
      setSelectedSnapshotId("");
      return;
    }

    const selectedStillExists = snapshots.some((item) => item.id === selectedSnapshotId);
    if (!selectedStillExists) {
      setSelectedSnapshotId(snapshots[0]?.id ?? "");
    }
  }, [selectedSnapshotId, snapshots]);

  const selectedSnapshot = useMemo(
    () => snapshots.find((item) => item.id === selectedSnapshotId) ?? null,
    [selectedSnapshotId, snapshots],
  );

  return (
    <div className="absolute left-4 top-20 z-20 w-[min(88vw,22rem)] sm:left-6 sm:top-24">
      <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-3 text-slate-100 shadow-[0_16px_48px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-100/78">
          Dev Snapshots
        </p>

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave || isBusy}
            className="rounded-lg border border-cyan-300/35 bg-cyan-500/15 px-2.5 py-1.5 text-xs font-medium text-cyan-100 transition-colors hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Save Current
          </button>
        </div>

        <div className="mt-3">
          <label htmlFor="dreamscape-snapshot-select" className="sr-only">
            Saved dreamscape snapshots
          </label>
          <select
            id="dreamscape-snapshot-select"
            value={selectedSnapshotId}
            onChange={(event) => setSelectedSnapshotId(event.currentTarget.value)}
            disabled={snapshots.length === 0 || isBusy}
            className="w-full rounded-lg border border-white/20 bg-slate-900/70 px-2.5 py-2 text-xs text-slate-100 outline-none transition-colors focus:border-cyan-300/70 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {snapshots.length === 0 ? (
              <option value="">No snapshots yet</option>
            ) : (
              snapshots.map((snapshot) => (
                <option key={snapshot.id} value={snapshot.id}>
                  {snapshot.label}
                </option>
              ))
            )}
          </select>
        </div>

        {selectedSnapshot ? (
          <p className="mt-2 text-[11px] text-slate-200/70">
            Saved {formatCreatedAt(selectedSnapshot.createdAt)}
          </p>
        ) : null}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (selectedSnapshotId) {
                onLoad(selectedSnapshotId);
              }
            }}
            disabled={!selectedSnapshotId || isBusy}
            className="rounded-lg border border-emerald-300/35 bg-emerald-500/15 px-2.5 py-1.5 text-xs font-medium text-emerald-100 transition-colors hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Load
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedSnapshotId) {
                onDelete(selectedSnapshotId);
              }
            }}
            disabled={!selectedSnapshotId || isBusy}
            className="rounded-lg border border-rose-300/35 bg-rose-500/15 px-2.5 py-1.5 text-xs font-medium text-rose-100 transition-colors hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Delete
          </button>
        </div>

        {error ? <p className="mt-3 text-xs text-rose-200">{error}</p> : null}
      </div>
    </div>
  );
}
