/** Shown only in Draft Mode, so editors never mistake a preview for the live page. */
export function PreviewBar({ path }: { path: string }) {
  return (
    <div className="cx-preview-bar" role="status">
      Preview mode
      <a href={`/api/draft/disable/?redirect=${encodeURIComponent(path)}`}>
        Exit
      </a>
    </div>
  );
}
