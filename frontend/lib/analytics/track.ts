/**
 * Pushes an event to the GTM dataLayer. GTM decides what reaches GA4 and
 * the Meta Pixel. Nothing here fires a "Lead": that event belongs only
 * after a lead is confirmed saved server-side (see the lead system plan).
 */
type DataLayerWindow = Window & { dataLayer?: Record<string, unknown>[] };

export function track(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const w = window as DataLayerWindow;
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push({ event, ...params });
}
