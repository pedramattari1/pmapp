import { saveTask, type SaveTaskInput, type TaskDetail } from "./api";

// Offline-resilient task saves. When a save fails because the device is offline,
// the payload is queued in localStorage and retried when connectivity returns
// (the ServiceWorkerRegistrar flushes on the "online" event and on load).
//
// The core (`makeQueue`) takes injectable storage + saver so it can be unit
// tested in Node without a browser.

export interface QueueItem {
  id: string;
  taskId: string;
  input: SaveTaskInput;
  ts: number;
}

export interface QueueStorage {
  read(): QueueItem[];
  write(items: QueueItem[]): void;
}

export type Saver = (taskId: string, input: SaveTaskInput) => Promise<TaskDetail>;

export function makeQueue(storage: QueueStorage, saver: Saver) {
  return {
    enqueue(taskId: string, input: SaveTaskInput): QueueItem {
      const item: QueueItem = {
        id: globalThis.crypto?.randomUUID?.() ?? String(Date.now() + Math.random()),
        taskId,
        input,
        ts: Date.now(),
      };
      storage.write([...storage.read(), item]);
      return item;
    },
    size(): number {
      return storage.read().length;
    },
    /** Attempt every queued save; drop the ones that succeed, keep failures. */
    async flush(): Promise<{ flushed: number; remaining: number }> {
      const items = storage.read();
      const kept: QueueItem[] = [];
      let flushed = 0;
      for (const it of items) {
        try {
          await saver(it.taskId, it.input);
          flushed++;
        } catch {
          kept.push(it);
        }
      }
      storage.write(kept);
      return { flushed, remaining: kept.length };
    },
  };
}

const STORAGE_KEY = "fay-pm-offline-saves";

const browserStorage: QueueStorage = {
  read() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as QueueItem[];
    } catch {
      return [];
    }
  },
  write(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  },
};

// Fresh Clerk token at flush time (queued items may sit long past a token's TTL).
const browserSaver: Saver = async (taskId, input) => {
  const w = window as unknown as {
    Clerk?: { session?: { getToken?: () => Promise<string | null> } };
  };
  const token = (await w.Clerk?.session?.getToken?.()) ?? null;
  return saveTask(token, taskId, input);
};

let defaultQueue: ReturnType<typeof makeQueue> | null = null;
function getDefault() {
  if (!defaultQueue) defaultQueue = makeQueue(browserStorage, browserSaver);
  return defaultQueue;
}

export function enqueueSave(taskId: string, input: SaveTaskInput): void {
  getDefault().enqueue(taskId, input);
}

export function queuedCount(): number {
  if (typeof window === "undefined") return 0;
  return getDefault().size();
}

export async function flushQueue(): Promise<void> {
  if (typeof window === "undefined") return;
  await getDefault().flush();
}
