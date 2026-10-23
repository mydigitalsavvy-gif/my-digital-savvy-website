import Link from "next/link";

export default function NotFound() {
  return (
    <main className="p-mds-pad flex min-h-svh flex-col items-center justify-center gap-4 text-center">
      <p className="text-mds-ash text-xs font-semibold tracking-[0.12em] uppercase">
        404
      </p>
      <h1 className="text-3xl font-extrabold tracking-tight uppercase">
        Page not found
      </h1>
      <Link href="/" className="text-sm underline hover:text-[var(--accent)]">
        Back home
      </Link>
    </main>
  );
}
