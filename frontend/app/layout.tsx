import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getHomeContent } from "@/lib/content/home";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ConsultPopup } from "@/components/interactions/ConsultPopup";
import { PageEffects } from "@/components/interactions/PageEffects";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildOrganizationSchema } from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

/* Same family and weights the reference loads from Google Fonts
   (Inter 400–900, display=swap), self-hosted by next/font. The CSS reads
   it through var(--font-inter). */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "My Digital Savvy — Digital marketing agency in Nagpur",
    template: "%s — My Digital Savvy",
  },
  description:
    "My Digital Savvy runs Meta Ads, builds websites and creates content for businesses across Nagpur, Indore, Raipur, Hyderabad and Jabalpur.",
  openGraph: {
    type: "website",
    siteName: "My Digital Savvy",
    title: "My Digital Savvy — Digital marketing agency in Nagpur",
    description:
      "My Digital Savvy runs Meta Ads, builds websites and creates content for businesses across Nagpur, Indore, Raipur, Hyderabad and Jabalpur.",
    url: "https://mydigitalsavvy.com/",
  },
  twitter: {
    card: "summary",
    title: "My Digital Savvy — Digital marketing agency in Nagpur",
    description:
      "My Digital Savvy runs Meta Ads, builds websites and creates content for businesses across Nagpur, Indore, Raipur, Hyderabad and Jabalpur.",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const content = await getHomeContent();

  return (
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth">
      <body>
        <JsonLd data={buildOrganizationSchema()} />
        <span
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
          id="srLive"
        ></span>
        <Header
          nav={content.nav}
          services={content.services.items}
          servicesHref={content.services.menuHref}
        />
        {children}
        <Footer footer={content.footer} />
        <ConsultPopup popup={content.popup} />
        <PageEffects />
      </body>
    </html>
  );
}
