import { renderMap, type MapData, type MapId } from "./textures";

/**
 * Globe maps for the focused body, generated on demand in priority order:
 * in a Web Worker when one can start (nothing runs on the main thread),
 * otherwise in idle time, one map per idle slice. A body that comes into
 * focus before its map is ready moves to the front of the queue and is
 * drawn from its sprite until then.
 */
export type MapStore = {
  get(id: MapId): MapData | null;
  /** ask for a map now (moves it to the front of the queue) */
  want(id: MapId): void;
  ready(): number;
  destroy(): void;
};

type Job = { id: MapId; seed: number };

const W = 256;
const H = 128;

export function createMapStore(order: Job[]): MapStore {
  const maps = new Map<MapId, MapData>();
  const queue: Job[] = [];
  for (const j of order) if (!queue.some((q) => q.id === j.id)) queue.push(j);
  let inflight: MapId | null = null;
  let worker: Worker | null = null;
  let dead = false;
  let idleId = 0;

  const idle = (fn: () => void) => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    };
    idleId = w.requestIdleCallback
      ? w.requestIdleCallback(fn, { timeout: 600 })
      : window.setTimeout(fn, 40);
  };

  const next = (): void => {
    if (dead || inflight) return;
    const job = queue.shift();
    if (!job) {
      // all maps built: the worker's job is done
      worker?.terminate();
      worker = null;
      return;
    }
    if (maps.has(job.id)) return next();
    inflight = job.id;
    if (worker) {
      worker.postMessage({ id: job.id, w: W, h: H, seed: job.seed });
    } else {
      idle(() => {
        if (dead) return;
        maps.set(job.id, renderMap(job.id, W, H, job.seed));
        inflight = null;
        next();
      });
    }
  };

  try {
    worker = new Worker(new URL("./maps.worker.ts", import.meta.url));
    worker.onmessage = (e: MessageEvent) => {
      const d = e.data as {
        id: MapId;
        w: number;
        h: number;
        rgba: Uint8ClampedArray;
      };
      maps.set(d.id, { id: d.id, w: d.w, h: d.h, rgba: d.rgba });
      inflight = null;
      next();
    };
    worker.onerror = () => {
      // fall back to idle time on the main thread
      worker?.terminate();
      worker = null;
      if (inflight) {
        const id = inflight;
        inflight = null;
        const seed = order.find((j) => j.id === id)?.seed ?? 1;
        queue.unshift({ id, seed });
      }
      next();
    };
  } catch {
    worker = null;
  }
  next();

  return {
    get: (id) => maps.get(id) ?? null,
    want(id) {
      if (maps.has(id) || inflight === id) return;
      const i = queue.findIndex((q) => q.id === id);
      if (i > 0) queue.unshift(...queue.splice(i, 1));
      if (i < 0)
        queue.unshift({ id, seed: order.find((j) => j.id === id)?.seed ?? 1 });
      next();
    },
    ready: () => maps.size,
    destroy() {
      dead = true;
      worker?.terminate();
      worker = null;
      const w = window as Window & {
        cancelIdleCallback?: (id: number) => void;
      };
      if (w.cancelIdleCallback) w.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
      maps.clear();
    },
  };
}
