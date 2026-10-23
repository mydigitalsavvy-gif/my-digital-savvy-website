import { allPosts } from "@/lib/wordpress";
import { rssResponse } from "@/lib/content/rss";

/** /feed/ — the site RSS feed WordPress served at the same URL. */
export const revalidate = 3600;

export async function GET() {
  const posts = await allPosts();
  return rssResponse({
    title: "My Digital Savvy",
    selfPath: "/feed/",
    description: "Marketing notes from My Digital Savvy, Nagpur.",
    posts,
  });
}
