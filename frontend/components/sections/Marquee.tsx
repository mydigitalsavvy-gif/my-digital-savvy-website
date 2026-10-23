/**
 * Infinite strip. The reference built the track with innerHTML at runtime;
 * here it's server-rendered with the list doubled, so the -50% keyframe
 * loops seamlessly with no JavaScript at all.
 */
export function Marquee({
  items,
  className = "strip reveal",
  trackId,
  ariaLabel,
  hideStrip = false,
}: {
  items: string[];
  className?: string;
  trackId: string;
  ariaLabel?: string;
  /** The reviewer strip hides the whole strip from assistive tech. */
  hideStrip?: boolean;
}) {
  const doubled = [...items, ...items];
  return (
    <div
      className={className}
      aria-label={hideStrip ? undefined : ariaLabel}
      role={hideStrip ? undefined : "marquee"}
      aria-hidden={hideStrip ? "true" : undefined}
    >
      <div
        className="track"
        id={trackId}
        aria-hidden={hideStrip ? undefined : "true"}
      >
        {doubled.map((name, i) => (
          <span key={i}>
            {name} <i>·</i>
          </span>
        ))}
      </div>
    </div>
  );
}
