import type { Metadata } from "next";
import { getHomeContent } from "@/lib/content/home";
import { About } from "@/components/sections/About";
import { Think } from "@/components/sections/Think";
import { Process } from "@/components/sections/Process";

export const metadata: Metadata = {
  title: "About",
  description:
    "My Digital Savvy is a digital marketing agency based in Nagpur, Maharashtra — one team running Meta Ads, websites and content for businesses across Maharashtra.",
  alternates: { canonical: "/about/" },
};

/** New URL (no WordPress equivalent). Reuses the homepage's own About, Think and Process sections. */
export default async function AboutPage() {
  const c = await getHomeContent();
  return (
    <main>
      <About about={c.about} />
      <Think think={c.think} />
      <Process process={c.process} />
    </main>
  );
}
