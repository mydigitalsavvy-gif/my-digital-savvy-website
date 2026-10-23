# My Digital Savvy — Next.js frontend

Next.js 16 (App Router, TypeScript) frontend for mydigitalsavvy.com. WordPress becomes a headless CMS behind it later.

## The design contract

`../my-digital-savvy-v2.html` is the visual source of truth. The homepage is a faithful port of it, verified element by element and pixel by pixel at 1440, 1280, 1024, 390, 375 and 360px widths.

- **CSS** lives in `styles/mds/`, extracted verbatim from the reference in its original cascade order. The only edit is routing `'Inter'` through `next/font`. Don't hand-format these files. They're excluded from Prettier so they stay diffable against the reference.
- **Deliberate deviations** are listed in `styles/mds/31-fixes.css`. Currently there's one: growth-system stages 02–06 were blank on mobile in the reference.
- **Tailwind** loads theme and utilities only, without its preflight reset, because the reference relies on its own reset and browser defaults.

## Structure

| Path                        | Role                                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| `types/home.ts`             | Typed homepage content model                                                                         |
| `content/home.ts`           | Static content, transcribed 1:1 from the reference. `CONFIRM` marks figures to verify before launch. |
| `lib/content/home.ts`       | The only content entry point. Swap its body for a WordPress adapter that returns the same shape.     |
| `components/layout/`        | Header, mobile drawer, services mega menu, footer                                                    |
| `components/sections/`      | One server component per homepage section, in reference order                                        |
| `components/interactions/`  | Small client components: rotor, count-up, scroll controllers, carousel, popup, page effects          |
| `components/seo/JsonLd.tsx` | Structured data with `<` escaped                                                                     |
| `lib/wordpress/`            | Server-only WordPress REST client                                                                    |

Sections render on the server. Only interactive pieces hydrate. Scroll controllers render nothing and toggle classes on server-rendered markup, exactly like the reference scripts did.

## WordPress (Phase 5)

WordPress is a content source only. See `../docs/phase-5/README.md` for the audit, URL inventory and pending WordPress-side changes.

| Path                                  | Role                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| `lib/wordpress/path-index.ts`         | Which content lives at which URL; previous-path 301s                                  |
| `lib/wordpress/html-blocks.ts`        | WordPress/Elementor HTML → typed blocks (no CMS HTML is rendered)                     |
| `lib/wordpress/*.ts`                  | One adapter per content type → models in `types/content.ts`                           |
| `lib/content/entries.tsx`             | Path entry → view + metadata, shared by all content routes                            |
| `proxy.ts` + `config/redirects.ts`    | Every legacy redirect as one 301 (slash, case, Yoast sitemaps, feeds, previous paths) |
| `app/[slug]`                          | Every existing root-level URL (services, cities, posts, pages, blog index)            |
| `app/api/revalidate`, `app/api/draft` | On-save cache invalidation and editor preview                                         |
| `../wordpress/mu-plugins`             | Prepared WordPress plugins (not installed)                                            |

Without `WORDPRESS_API_URL` the site runs on the static homepage content.

## Commands

```bash
pnpm dev            # or npm run dev
pnpm build
pnpm lint
pnpm format:check
pnpm typecheck
pnpm migrate:build     # Phase 6: build draft payloads from WordPress (read-only)
pnpm migrate:import    # Phase 6: validate payloads (dry run); --apply needs approval, see docs/phase-6
```

`trailingSlash: true` matches the live WordPress URLs. Keep it on.
