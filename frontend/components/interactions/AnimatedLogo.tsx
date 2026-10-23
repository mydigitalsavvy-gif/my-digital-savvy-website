"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Port of the reference's chromaKeyLogo(): the logo video renders on a flat
 * white background, so every frame is drawn to a canvas and near-white,
 * low-saturation pixels are keyed out live, with a short feathered band.
 * The <video> is visually hidden (never display:none, which stops decoding).
 * Under reduced motion it draws one settled frame instead of looping.
 *
 * A static, pre-keyed copy of the settled frame (/logo-light.png,
 * /logo-dark.png — same crop, same key, same 706×160) is server-rendered
 * in the canvas's place and stays until the video is actually playing.
 * Mobile browsers don't always deliver frames (iOS Low Power Mode,
 * autoplay blocked, a slow 1.8 MB download), which used to leave an empty
 * canvas — an invisible logo. If the canvas can't read the video's
 * pixels, the static logo simply stays.
 * Off screen (IntersectionObserver), the loop and the video pause, so the
 * header and footer logos only cost anything while they can be seen.
 *
 * Only the band of the frame the logo ever occupies (CROP, measured over
 * the whole 8s loop) is drawn, so the canvas holds the logo alone: it can
 * be shown much larger at the same pixel cost, with no empty margins.
 *
 * `onDark` draws the reversed logo for dark backgrounds: after keying,
 * every pixel's lightness is inverted with its hue kept (navy wordmark →
 * pale blue-white, black outlines → white, the grey plate → charcoal), so
 * the cyan and the small coloured icons stay as they are.
 *
 * PERFORMANCE NOTE: while visible, per-frame getImageData on the main
 * thread is still the heaviest thing it does. The visually identical
 * fix is a pre-keyed transparent asset.
 */

/** where the logo sits in the video frame, as fractions of its size */
const CROP = { x: 0.155, y: 0.35, w: 0.727, h: 0.293 };
/** canvas resolution: the crop at ~half the 1920×1080 source */
const CANVAS_W = 706;
const CANVAS_H = 160;

export function AnimatedLogo({
  canvasClassName,
  videoId,
  canvasId,
  onDark = false,
}: {
  canvasClassName: string;
  videoId: string;
  canvasId: string;
  onDark?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // true once the canvas holds real keyed frames; until then the static logo shows
  const [live, setLive] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const W = canvas.width;
    const H = canvas.height;
    let failed = false;
    let raf: number | null = null;
    video.muted = true; // React doesn't reliably reflect `muted`; play() needs it.

    function fallbackToStatic() {
      if (failed) return;
      failed = true;
      setLive(false);
    }

    function keyFrame() {
      if (failed || !video || !ctx) return false;
      try {
        const vw = video.videoWidth || 1920;
        const vh = video.videoHeight || 1080;
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(
          video,
          vw * CROP.x,
          vh * CROP.y,
          vw * CROP.w,
          vh * CROP.h,
          0,
          0,
          W,
          H
        );
        const frame = ctx.getImageData(0, 0, W, H);
        const d = frame.data;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i],
            g = d[i + 1],
            b = d[i + 2];
          const lo = Math.min(r, g, b),
            hi = Math.max(r, g, b);
          const neutral = hi - lo < 18;
          const bright = (r + g + b) / 3;
          if (neutral && bright > 224) {
            d[i + 3] = 0;
            continue;
          }
          if (neutral && bright > 194)
            d[i + 3] = Math.round(255 * (1 - (bright - 194) / (224 - 194)));
          if (onDark) {
            // HSL lightness L → 1 − L with hue and saturation kept: one
            // shift of all three channels (clamped by the array)
            const s = 255 - hi - lo;
            d[i] = r + s;
            d[i + 1] = g + s;
            d[i + 2] = b + s;
          }
        }
        ctx.putImageData(frame, 0, 0);
        return true;
      } catch {
        fallbackToStatic();
        return false;
      }
    }

    const cleanups: (() => void)[] = [];

    if (reduce) {
      const settle = () => {
        video.currentTime = Math.min(7, video.duration || 7);
        const once = () => {
          video.removeEventListener("seeked", once);
          if (keyFrame()) setLive(true);
        };
        video.addEventListener("seeked", once);
        cleanups.push(() => video.removeEventListener("seeked", once));
      };
      if (video.readyState >= 1 && video.duration) settle();
      else {
        video.addEventListener("loadedmetadata", settle, { once: true });
        cleanups.push(() =>
          video.removeEventListener("loadedmetadata", settle)
        );
      }
      return () => cleanups.forEach((fn) => fn());
    }

    // only runs while the video plays, so its first keyed frame is the
    // moment the canvas replaces the static logo
    let shown = false;
    const loop = () => {
      if (keyFrame() && !shown) {
        shown = true;
        setLive(true);
      }
      if (!failed) raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!raf) loop();
    };
    const stop = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else if (video.paused) tryPlay();
      else start();
    };
    // Only animate while the logo is (nearly) on screen: off screen, the
    // per-frame pixel work and the video decode are both paused. The
    // wrapper is observed, not the canvas, because the canvas stays
    // display:none (never intersecting) until it has a frame to show.
    // Without IntersectionObserver it simply always runs, as before.
    const canObserve = "IntersectionObserver" in window;
    let onScreen = !canObserve;
    // play() is called as soon as the logo is on screen, never after
    // waiting for data: iOS Safari loads no video data until play() is
    // called (it treats preload="auto" as "metadata"), so waiting for
    // loadeddata first meant the animation never started on iPhones. If
    // autoplay itself is refused (iOS Low Power Mode, or a browser set to
    // block it), the first tap, click or key press on the page retries.
    const GESTURES = ["touchend", "click", "keydown"] as const;
    let awaitingGesture = false;
    function onGesture() {
      awaitingGesture = false;
      GESTURES.forEach((t) => document.removeEventListener(t, onGesture));
      tryPlay();
    }
    function tryPlay() {
      if (!video || !onScreen || !video.paused) return;
      video.play().catch((err: unknown) => {
        if (awaitingGesture) return;
        if (!(err instanceof DOMException) || err.name !== "NotAllowedError")
          return;
        awaitingGesture = true;
        GESTURES.forEach((t) =>
          document.addEventListener(t, onGesture, { passive: true })
        );
      });
    }
    const io = canObserve
      ? new IntersectionObserver(
          ([entry]) => {
            onScreen = entry.isIntersecting;
            if (!onScreen) {
              stop();
              video.pause();
            } else if (video.paused) tryPlay();
            else if (!document.hidden) start();
          },
          { rootMargin: "120px 0px" }
        )
      : null;
    io?.observe(canvas.parentElement ?? canvas);
    // one keyed frame as soon as the video has data, even off screen, so
    // the canvas is never empty when a fast scroll brings it into view
    const prime = () => keyFrame();

    video.addEventListener("playing", start);
    document.addEventListener("visibilitychange", onVisibility);
    if (video.readyState >= 2) prime();
    else video.addEventListener("loadeddata", prime, { once: true });
    tryPlay();

    return () => {
      stop();
      io?.disconnect();
      video.removeEventListener("playing", start);
      video.removeEventListener("loadeddata", prime);
      document.removeEventListener("visibilitychange", onVisibility);
      GESTURES.forEach((t) => document.removeEventListener(t, onGesture));
    };
  }, [onDark]);

  return (
    <>
      <video
        ref={videoRef}
        id={videoId}
        className="logo-source-video"
        src="/logo-animation.mp4"
        muted
        loop
        playsInline
        preload="auto"
      />
      {live ? null : (
        <Image
          src={onDark ? "/logo-dark.png" : "/logo-light.png"}
          alt="My Digital Savvy"
          className={canvasClassName}
          width={CANVAS_W}
          height={CANVAS_H}
          priority={!onDark}
          unoptimized
        />
      )}
      <canvas
        ref={canvasRef}
        id={canvasId}
        className={canvasClassName}
        width={CANVAS_W}
        height={CANVAS_H}
        aria-hidden="true"
        style={live ? undefined : { display: "none" }}
      />
    </>
  );
}
