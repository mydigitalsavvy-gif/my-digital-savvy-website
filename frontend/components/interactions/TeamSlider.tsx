"use client";

import { useState } from "react";
import type { TeamImage } from "@/types/home";
import { ContentImage } from "@/components/content/Blocks";

/**
 * Manual-only (no autoplay) so there's nothing that needs a pause control
 * or a reduced-motion exception — the slide transition itself is already
 * killed sitewide by the `* { transition: none }` reduced-motion rule.
 * With a single photo (today) the prev/next/dots controls simply don't
 * render — there's nothing for them to do — but the component is ready
 * to page through more the moment they're added to about.team.
 */
export function TeamSlider({ images }: { images: TeamImage[] }) {
  const [index, setIndex] = useState(0);
  if (!images.length) return null;

  const multi = images.length > 1;
  const go = (n: number) => setIndex((n + images.length) % images.length);

  return (
    <div
      className="team-slider"
      role={multi ? "region" : undefined}
      aria-roledescription={multi ? "carousel" : undefined}
      aria-label={multi ? "Photos of the team" : undefined}
      tabIndex={multi ? 0 : undefined}
      onKeyDown={
        multi
          ? (e) => {
              if (e.key === "ArrowRight") go(index + 1);
              else if (e.key === "ArrowLeft") go(index - 1);
              else return;
              e.preventDefault();
            }
          : undefined
      }
    >
      <div className="team-slider-viewport">
        <div
          className="team-slider-track"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {images.map((img, i) => (
            <figure
              className="team-slider-slide"
              key={img.url}
              aria-hidden={multi ? i !== index : undefined}
            >
              <ContentImage
                image={img}
                sizes="(max-width: 760px) 100vw, 560px"
              />
            </figure>
          ))}
        </div>
      </div>

      {multi ? (
        <>
          <button
            type="button"
            className="team-slider-nav team-slider-prev"
            aria-label="Previous photo"
            onClick={() => go(index - 1)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            className="team-slider-nav team-slider-next"
            aria-label="Next photo"
            onClick={() => go(index + 1)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="team-slider-dots" role="tablist" aria-label="Choose a photo">
            {images.map((img, i) => (
              <button
                key={img.url}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Photo ${i + 1} of ${images.length}`}
                className={i === index ? "is-active" : undefined}
                onClick={() => go(i)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
