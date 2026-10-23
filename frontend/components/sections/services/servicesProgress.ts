/**
 * Live scroll state of the pinned services sequence: the one small
 * interface between ServicesScroll (the only writer, once per animation
 * frame while the page scrolls) and the solar-system renderer (reads it
 * every frame). A plain mutable object on purpose: no React state, no
 * events, nothing re-renders.
 */
export const servicesProgress = {
  /**
   * Continuous position through the sequence: 0 = service 01 fully shown,
   * 1 = service 02 … n-1 = the last. Fractions are transitions; -1…0 is
   * the arrival before the first service and n-1…n the departure after
   * the last.
   */
  s: 0,
  /** the service whose panel is shown: the nearest one to `s` */
  active: 0,
};
