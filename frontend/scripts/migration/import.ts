/**
 * Phase 6 — import batch-1 payloads into WordPress as DRAFTS.
 *
 *   pnpm migrate:import                         # dry run (default): validates, writes nothing
 *   pnpm migrate:import --apply --expect-site https://mydigitalsavvy.com [--only <slug>]
 *
 * Environment (server-side only, never committed):
 *   WP_IMPORT_API_URL        e.g. https://mydigitalsavvy.com/wp-json
 *   WP_IMPORT_USER           dedicated Editor-role user
 *   WP_IMPORT_APP_PASSWORD   that user's Application Password
 *
 * Guards (any failure aborts before the first write):
 *   1. The site's own reported URL must equal --expect-site.
 *   2. The user must be an Editor and must NOT be an Administrator.
 *   3. The structured post types (mds-content-model.php) must be registered.
 *   4. Every write is status "draft". Nothing is ever published, deleted,
 *      or touched outside the structured post types; Elementor pages stay live.
 *   5. Re-runs update the same draft (matched by slug + source page id).
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const opt = (name: string) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : undefined;

const APPLY = flag("--apply");
const EXPECT_SITE = opt("--expect-site")?.replace(/\/$/, "");
const ONLY = opt("--only");
const API = process.env.WP_IMPORT_API_URL?.replace(/\/$/, "");
const USER = process.env.WP_IMPORT_USER;
const PASS = process.env.WP_IMPORT_APP_PASSWORD;
const DIR = path.resolve(__dirname, "../../../wordpress/migration/batch-1");

interface Payload {
  source: { page_id: number; url: string; kind: string };
  target: { post_type: string; rest_base: string };
  body: {
    title: string;
    slug: string;
    status: string;
    content?: string;
    featured_media?: number;
    acf: Record<string, unknown> & {
      benefits?: { title: string; body: string; image_url: string | null }[];
    };
    meta: Record<string, string>;
  };
}

const auth = () => "Basic " + Buffer.from(`${USER}:${PASS}`).toString("base64");

async function wp<T>(p: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}/${p.replace(/^\//, "")}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: auth(),
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok)
    throw new Error(
      `${init.method ?? "GET"} ${p} → ${res.status}: ${text.slice(0, 300)}`
    );
  return JSON.parse(text) as T;
}

function loadPayloads(): Payload[] {
  return fs
    .readdirSync(DIR)
    .filter(
      (f) =>
        f.endsWith(".json") &&
        f !== "manifest.json" &&
        !f.startsWith("import-log")
    )
    .map(
      (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as Payload
    )
    .filter((p) => !ONLY || p.body.slug === ONLY);
}

/** Offline checks that need no WordPress access. */
function validate(p: Payload): string[] {
  const problems: string[] = [];
  const all = JSON.stringify(p.body);
  if (p.body.status !== "draft") problems.push("status is not draft");
  if (
    /data-widget_type|elementor-[a-z]|<script|<style|\sclass=|\sstyle=/i.test(
      all
    )
  )
    problems.push("contains Elementor/unsafe markup");
  if (
    !p.body.acf.public_path ||
    !String(p.body.acf.public_path).startsWith("/")
  )
    problems.push("missing public_path");
  if (!p.body.meta._yoast_wpseo_title) problems.push("missing Yoast title");
  if (!p.body.title) problems.push("missing title");
  return problems;
}

async function resolveMedia(url: string | null): Promise<number | null> {
  if (!url) return null;
  const base = url
    .split("/")
    .pop()!
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/-\d+x\d+$/, "");
  const hits = await wp<{ id: number; source_url: string }[]>(
    `wp/v2/media?search=${encodeURIComponent(base)}&per_page=20&_fields=id,source_url`
  );
  return hits.find((m) => m.source_url === url)?.id ?? null;
}

async function main() {
  const payloads = loadPayloads();
  console.log(
    `${payloads.length} payload(s) in ${DIR}\nMode: ${APPLY ? "APPLY (drafts only)" : "DRY RUN (no writes)"}\n`
  );

  let invalid = 0;
  for (const p of payloads) {
    const problems = validate(p);
    if (problems.length) invalid++;
    console.log(
      `${problems.length ? "✗" : "✓"} ${p.target.post_type.padEnd(14)} ${p.body.acf.public_path}  ${problems.join("; ")}`
    );
  }
  if (invalid) throw new Error(`${invalid} payload(s) failed validation`);
  if (!APPLY) {
    console.log("\nDry run complete. Nothing was sent to WordPress.");
    return;
  }

  // ── guards ───────────────────────────────────────────────────────
  if (!API || !USER || !PASS)
    throw new Error(
      "WP_IMPORT_API_URL, WP_IMPORT_USER and WP_IMPORT_APP_PASSWORD are required with --apply"
    );
  if (!EXPECT_SITE)
    throw new Error("--expect-site <url> is required with --apply");
  const root = (await (await fetch(`${API}/`)).json()) as {
    url?: string;
    home?: string;
    name?: string;
  };
  const site = (root.home ?? root.url ?? "").replace(/\/$/, "");
  if (site !== EXPECT_SITE)
    throw new Error(
      `Refusing: API reports site "${site}", expected "${EXPECT_SITE}"`
    );
  const me = await wp<{ name: string; roles?: string[] }>(
    "wp/v2/users/me?context=edit"
  );
  const roles = me.roles ?? [];
  if (roles.includes("administrator"))
    throw new Error("Refusing: importer must not be an Administrator");
  if (!roles.includes("editor"))
    throw new Error(
      `Refusing: importer needs the Editor role (has: ${roles.join(", ") || "none"})`
    );
  const types = await wp<Record<string, unknown>>("wp/v2/types");
  for (const t of new Set(payloads.map((p) => p.target.post_type))) {
    if (!types[t])
      throw new Error(
        `Refusing: post type "${t}" is not registered (install mds-content-model.php first)`
      );
  }
  console.log(
    `\nSite ${site} · user ${me.name} (${roles.join(", ")}) · guards passed\n`
  );

  // ── import ───────────────────────────────────────────────────────
  const log: unknown[] = [];
  for (const p of payloads) {
    const acf = { ...p.body.acf };
    if (acf.benefits) {
      acf.benefits = (await Promise.all(
        acf.benefits.map(async (b) => ({
          title: b.title,
          body: b.body,
          image: await resolveMedia(b.image_url),
        }))
      )) as never;
    }
    const body = {
      ...p.body,
      status: "draft",
      acf,
      meta: { ...p.body.meta, mds_source_page_id: String(p.source.page_id) },
    };
    const existing = await wp<{ id: number; status: string }[]>(
      `wp/v2/${p.target.rest_base}?slug=${encodeURIComponent(p.body.slug)}&status=draft,pending,private&context=edit&_fields=id,status`
    );
    if (existing.some((e) => e.status !== "draft")) {
      log.push({
        slug: p.body.slug,
        action: "skipped",
        reason: "a non-draft post with this slug exists",
      });
      console.log(`- ${p.body.slug}: skipped (non-draft exists)`);
      continue;
    }
    const target = existing[0];
    const saved = await wp<{ id: number; link: string }>(
      target
        ? `wp/v2/${p.target.rest_base}/${target.id}`
        : `wp/v2/${p.target.rest_base}`,
      { method: "POST", body: JSON.stringify(body) }
    );
    log.push({
      slug: p.body.slug,
      action: target ? "updated draft" : "created draft",
      id: saved.id,
      source_page_id: p.source.page_id,
    });
    console.log(
      `✓ ${p.body.slug}: ${target ? "updated" : "created"} draft #${saved.id}`
    );
  }
  fs.writeFileSync(
    path.join(DIR, `import-log-${Date.now()}.json`),
    JSON.stringify({ site, user: me.name, log }, null, 2)
  );
}

main().catch((e) => {
  console.error(`\nABORTED: ${e.message}`);
  process.exit(1);
});
