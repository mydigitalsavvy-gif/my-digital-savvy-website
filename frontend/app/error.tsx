"use client";

import { useEffect } from "react";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="p-mds-pad flex min-h-svh flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight uppercase">
        Something went wrong
      </h1>
      <button
        onClick={() => retry()}
        className="border-mds-ink hover:bg-mds-ink hover:text-mds-paper rounded-full border px-6 py-3 text-xs font-semibold tracking-[0.08em] uppercase"
      >
        Try again
      </button>
    </main>
  );
}
