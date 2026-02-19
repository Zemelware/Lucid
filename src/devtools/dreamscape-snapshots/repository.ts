import type {
  CreateDreamscapeSnapshotInput,
  DreamscapeSnapshotListItem,
  DreamscapeSnapshotRecord,
} from "@/devtools/dreamscape-snapshots/types";

const DB_NAME = "lucid-dreamscape-snapshots";
const DB_VERSION = 1;
const SNAPSHOT_STORE = "snapshots";

function createSnapshotId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `snapshot-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

function ensureIndexedDb(): IDBFactory {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this browser.");
  }

  return indexedDB;
}

function openSnapshotDatabase(): Promise<IDBDatabase> {
  const idb = ensureIndexedDb();

  return new Promise((resolve, reject) => {
    const request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SNAPSHOT_STORE)) {
        database.createObjectStore(SNAPSHOT_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open snapshot database."));
    };
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  return openSnapshotDatabase().then(async (database) => {
    try {
      const transaction = database.transaction(SNAPSHOT_STORE, mode);
      const store = transaction.objectStore(SNAPSHOT_STORE);
      const result = await handler(store);

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error("Transaction failed."));
        transaction.onabort = () => reject(transaction.error ?? new Error("Transaction aborted."));
      });

      return result;
    } finally {
      database.close();
    }
  });
}

function requestAsPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

export async function listDreamscapeSnapshots(): Promise<DreamscapeSnapshotListItem[]> {
  return withStore("readonly", async (store) => {
    const rawRecords =
      ((await requestAsPromise(store.getAll())) as unknown as DreamscapeSnapshotRecord[]) ?? [];

    return rawRecords
      .map((record) => ({
        id: record.id,
        label: record.label,
        createdAt: record.createdAt,
        platform: record.platform,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
}

export async function getDreamscapeSnapshot(id: string): Promise<DreamscapeSnapshotRecord | null> {
  return withStore("readonly", async (store) => {
    const record =
      (await requestAsPromise(store.get(id))) as unknown as DreamscapeSnapshotRecord | undefined;
    return record ?? null;
  });
}

export async function saveDreamscapeSnapshot(
  input: CreateDreamscapeSnapshotInput,
): Promise<DreamscapeSnapshotRecord> {
  const record: DreamscapeSnapshotRecord = {
    id: createSnapshotId(),
    label: input.label,
    createdAt: new Date().toISOString(),
    platform: input.platform,
    image: input.image,
    analysis: input.analysis,
    narratorBlob: input.narratorBlob,
    sfxBlobs: input.sfxBlobs,
  };

  await withStore("readwrite", async (store) => {
    await requestAsPromise(store.put(record));
  });

  return record;
}

export async function deleteDreamscapeSnapshot(id: string): Promise<void> {
  await withStore("readwrite", async (store) => {
    await requestAsPromise(store.delete(id));
  });
}

export type DreamscapeSnapshotRepository = {
  list: typeof listDreamscapeSnapshots;
  get: typeof getDreamscapeSnapshot;
  save: typeof saveDreamscapeSnapshot;
  remove: typeof deleteDreamscapeSnapshot;
};

export const dreamscapeSnapshotRepository: DreamscapeSnapshotRepository = {
  list: listDreamscapeSnapshots,
  get: getDreamscapeSnapshot,
  save: saveDreamscapeSnapshot,
  remove: deleteDreamscapeSnapshot,
};
