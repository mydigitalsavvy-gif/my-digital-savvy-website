import "server-only";
import type { PortfolioModel } from "@/types/content";
import { htmlToBlocks, htmlToText } from "./html-blocks";
import { listObjects } from "./objects";
import { imageField, pathFromLink, title } from "./normalize";
import type { WPPortfolioProject } from "./types";

export async function normalizePortfolio(
  p: WPPortfolioProject
): Promise<PortfolioModel> {
  const f = p.acf ?? {};
  const gallery = (
    await Promise.all((f.gallery || []).map((g) => imageField(g)))
  ).filter((g): g is NonNullable<typeof g> => g !== null);
  const tech = Array.isArray(f.technologies)
    ? f.technologies
    : (f.technologies ?? "").split(",").map((t) => t.trim());
  return {
    id: p.id,
    path: f.public_path ?? pathFromLink(p.link) ?? `/portfolio/${p.slug}/`,
    projectName: f.project_name ? htmlToText(f.project_name) : title(p),
    category: f.category ? htmlToText(f.category) : null,
    gallery,
    technologies: tech.filter(Boolean),
    description: htmlToBlocks(f.description ?? p.content?.rendered).blocks,
    liveUrl: f.live_url || null,
  };
}

/** [] until the portfolio_project type exists. */
export async function listPortfolio(): Promise<PortfolioModel[]> {
  return Promise.all(
    (await listObjects<WPPortfolioProject>("portfolio_project")).map(
      normalizePortfolio
    )
  );
}
