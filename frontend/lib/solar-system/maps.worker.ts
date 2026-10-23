import { renderMap, type MapId } from "./textures";

/**
 * Generates globe maps off the main thread (see maps.ts), so building them
 * never competes with scrolling. One request at a time; the pixels are
 * transferred back, not copied.
 */
type MapRequest = { id: MapId; w: number; h: number; seed: number };

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<MapRequest>) => void) | null;
  postMessage(message: unknown, transfer: Transferable[]): void;
};

scope.onmessage = (e) => {
  const { id, w, h, seed } = e.data;
  const map = renderMap(id, w, h, seed);
  scope.postMessage({ id, w, h, rgba: map.rgba }, [map.rgba.buffer]);
};
