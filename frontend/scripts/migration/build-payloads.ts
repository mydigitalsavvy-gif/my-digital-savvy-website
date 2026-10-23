/**
 * Phase 6 — batch 1 migration payloads (READ-ONLY against WordPress).
 *
 *   pnpm migrate:build [--source https://mydigitalsavvy.com/wp-json]
 *
 * Reads the 13 legacy service/location pages from the WordPress REST API
 * and writes one import-ready DRAFT payload per page to
 * ../wordpress/migration/batch-1/. Content is extracted with the same
 * parser the site uses (lib/wordpress/html-blocks.ts), so the structured
 * fields contain exactly what the site renders today: no Elementor markup,
 * no invented copy. Fields with no source content are left empty and
 * listed for editorial review.
 */
import fs from "node:fs";
import path from "node:path";
import { parse } from "node-html-parser";
import { LEGACY_PAGE_KINDS } from "@/config/legacy-pages";
import {
  htmlToBlocks,
  htmlToText,
  inlineText,
} from "@/lib/wordpress/html-blocks";
import { splitHero } from "@/lib/wordpress/hero";
import { blocksToHtml, inlinesToHtml } from "@/lib/content/html-serialize";
import type { ContentBlock } from "@/types/content";

const args = process.argv.slice(2);
const SOURCE = (
  args[args.indexOf("--source") + 1] && args.includes("--source")
    ? args[args.indexOf("--source") + 1]
    : "https://mydigitalsavvy.com/wp-json"
).replace(/\/$/, "");
const OUT = path.resolve(__dirname, "../../../wordpress/migration/batch-1");

interface WPPageRaw {
  id: number;
  slug: string;
  link: string;
  modified: string;
  featured_media: number;
  title: { rendered: string };
  content: { rendered: string };
  yoast_head_json?: {
    title?: string;
    description?: string;
    og_title?: string;
    og_description?: string;
    og_image?: { url: string }[];
    robots?: { index?: string };
  };
}

const DROPPED_WIDGETS: Record<string, string> = {
  ".elementor-widget-counter": "counter (no verifiable number)",
  ".elementor-widget-button": "button (CTA is design-owned)",
  ".elementor-widget-wpr-dual-button": "button (CTA is design-owned)",
  ".elementor-widget-social-icons": "social icons (site-wide footer)",
  ".elementor-widget-shortcode": "shortcode",
  ".elementor-widget-html": "custom HTML",
};

function droppedByDesign(html: string) {
  const root = parse(html);
  const out: { widget: string; text: string }[] = [];
  for (const [sel, label] of Object.entries(DROPPED_WIDGETS)) {
    for (const el of root.querySelectorAll(sel)) {
      const text = el.text.replace(/\s+/g, " ").trim();
      out.push({ widget: label, text: text.slice(0, 120) });
    }
  }
  return out;
}

async function getJson<T>(url: string): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.ok) return (await res.json()) as T;
    if (res.status < 500) throw new Error(`${res.status} for ${url}`);
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  throw new Error(`failed: ${url}`);
}

function stepsOf(body: ContentBlock[]) {
  const i = body.findIndex((b) => b.type === "steps");
  if (i === -1)
    return {
      steps: [] as { title: string; body: ContentBlock[] }[],
      rest: body,
    };
  const block = body[i];
  const rest = [...body.slice(0, i), ...body.slice(i + 1)];
  return { steps: block.type === "steps" ? block.items : [], rest };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const targets = Object.entries(LEGACY_PAGE_KINDS).filter(
    ([, v]) => v.kind === "service" || v.kind === "location"
  );
  const manifest: unknown[] = [];

  for (const [slug, cfg] of targets) {
    const [page] = await getJson<WPPageRaw[]>(
      `${SOURCE}/wp/v2/pages?slug=${slug}&_fields=id,slug,link,modified,featured_media,title,content,yoast_head_json`
    );
    if (!page) {
      console.warn(`skip ${slug}: not found`);
      continue;
    }
    const pageTitle = htmlToText(page.title.rendered);
    const { blocks, faqs } = htmlToBlocks(page.content.rendered);
    const hero = splitHero(blocks, pageTitle, page.yoast_head_json?.title);
    const { steps, rest: afterSteps } = stepsOf(hero.body);
    // Same rule as the site adapter: first image/icon-box group = service benefits.
    const cardsIdx =
      cfg.kind === "service"
        ? afterSteps.findIndex((b) => b.type === "cards")
        : -1;
    const cardsBlock = cardsIdx !== -1 ? afterSteps[cardsIdx] : null;
    const rest =
      cardsIdx !== -1
        ? [...afterSteps.slice(0, cardsIdx), ...afterSteps.slice(cardsIdx + 1)]
        : afterSteps;
    const benefits =
      cardsBlock && cardsBlock.type === "cards"
        ? cardsBlock.items.map((c) => ({
            title: c.title,
            body: inlineText(c.body),
            image_url: c.image?.url ?? null,
          }))
        : [];
    const publicPath = new URL(page.link).pathname;
    const y = page.yoast_head_json ?? {};

    const meta = {
      _yoast_wpseo_title: y.title ?? "",
      _yoast_wpseo_metadesc: y.description ?? "",
      "_yoast_wpseo_opengraph-title": y.og_title ?? "",
      "_yoast_wpseo_opengraph-description": y.og_description ?? "",
      "_yoast_wpseo_opengraph-image": y.og_image?.[0]?.url ?? "",
      "_yoast_wpseo_meta-robots-noindex":
        y.robots?.index === "noindex" ? "1" : "",
    };
    const faqRows = faqs.map((f) => ({
      question: f.question,
      answer: blocksToHtml(f.answer),
    }));
    const gaps: string[] = [];

    let body: Record<string, unknown>;
    let restBase: string;
    if (cfg.kind === "service") {
      restBase = "services";
      body = {
        status: "draft",
        title: pageTitle,
        slug,
        featured_media: page.featured_media || 0,
        acf: {
          public_path: publicPath,
          previous_paths: [],
          catalogue_slug: cfg.catalogueSlug ?? "",
          hero: {
            headline: hero.heading,
            intro: inlineText(hero.intro),
            image: page.featured_media || null,
          },
          short_description: "",
          long_description: blocksToHtml(rest),
          // image_url is resolved to the existing media-library ID by the importer.
          benefits,
          process: steps.map((s) => ({
            title: s.title,
            body: blocksToHtml(s.body),
          })),
          faqs: faqRows,
          related_case_studies: [],
          industries: [],
          cta: { label: "Get your free audit", url: "#contact" },
        },
        meta,
      };
      gaps.push(
        "short_description (also changes the homepage panel lede; left empty on purpose)"
      );
      if (!benefits.length)
        gaps.push("benefits (no feature cards on the page)");
      if (!faqRows.length) gaps.push("faqs (none on the page)");
      gaps.push(
        "related_case_studies / industries (no case studies or industries exist yet)"
      );
      if (!cfg.catalogueSlug)
        gaps.push("catalogue_slug (no matching homepage service panel)");
    } else {
      restBase = "location-pages";
      body = {
        status: "draft",
        title: pageTitle,
        slug,
        content: blocksToHtml(rest),
        acf: {
          public_path: publicPath,
          previous_paths: [],
          city: cfg.city ?? "",
          intro: inlineText(hero.intro),
          services_offered: [],
          local_proof: "",
          faqs: faqRows,
        },
        meta,
      };
      // Location pages render their hero H1 from the post title; keep the live H1 there.
      (body as { title: string }).title = hero.heading;
      gaps.push("services_offered (link after services are imported)");
      gaps.push("local_proof (no verifiable local proof on the page)");
      if (steps.length)
        gaps.push(
          "process steps found on a location page: flattened into the body"
        );
      if (steps.length)
        (body as { content: string }).content +=
          "\n" + blocksToHtml([{ type: "steps", items: steps }]);
    }

    const payload = {
      batch: 1,
      source: {
        page_id: page.id,
        url: page.link,
        modified: page.modified,
        kind: cfg.kind,
      },
      target: {
        post_type: cfg.kind === "service" ? "service" : "location_page",
        rest_base: restBase,
      },
      body,
      review: {
        status: "PENDING_EDITORIAL_REVIEW",
        h1: hero.heading,
        editorial_gaps: gaps,
        dropped_by_design: droppedByDesign(page.content.rendered),
        stats: {
          body_blocks: rest.length,
          process_steps: steps.length,
          faqs: faqRows.length,
          images: rest.filter((b) => b.type === "image").length,
          benefits: benefits.length,
        },
      },
    };
    fs.writeFileSync(
      path.join(OUT, `${slug}.json`),
      JSON.stringify(payload, null, 2) + "\n"
    );
    manifest.push({
      slug,
      kind: cfg.kind,
      page_id: page.id,
      h1: hero.heading,
      intro: inlinesToHtml(hero.intro).slice(0, 80),
      ...payload.review.stats,
      gaps: gaps.length,
      dropped: payload.review.dropped_by_design.length,
    });
    console.log(
      `✓ ${slug} (${cfg.kind}) — ${rest.length} blocks, ${steps.length} steps, ${faqRows.length} FAQs`
    );
  }

  fs.writeFileSync(
    path.join(OUT, "manifest.json"),
    JSON.stringify(
      {
        generated: new Date().toISOString(),
        source: SOURCE,
        status: "NOT IMPORTED — drafts only, requires approval",
        pages: manifest,
      },
      null,
      2
    ) + "\n"
  );
  console.log(`\nWrote ${manifest.length} payloads to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
