import Link from "next/link";
import { Breadcrumbs } from "@/components/content/PageParts";
import { CareersContact } from "./CareersContact";

export function CareersHero({ openVacancies }: { openVacancies: number }) {
  return (
    <section className="cx-hero wrap">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Careers", path: "/careers/" }]} />
      <div className="eyebrow">
        <span className="pip" aria-hidden="true"></span>
        <span className="label">Careers at My Digital Savvy</span>
      </div>
      <h1 className="display">Build digital marketing work people actually see</h1>
      <p className="hero-sub">
        My Digital Savvy is a Nagpur-based digital marketing team. We&apos;re looking for people
        who want to work on social media, content, design, video, HR and related roles for real
        client brands. Browse what&apos;s open below, or get in touch if you&apos;re a freelancer
        or an agency interested in working with us.
      </p>
      <div className="btns">
        <Link href="#positions" className="btn solid">
          Explore open positions
        </Link>
        <Link href="/careers/partnership/" className="btn ghost">
          Freelancer or agency partner? Start here
        </Link>
      </div>
      {openVacancies > 0 ? (
        <p className="cy-vacancy-stat">
          <strong>{openVacancies}</strong> open {openVacancies === 1 ? "vacancy" : "vacancies"}{" "}
          right now
        </p>
      ) : null}
      <div className="cy-hero-contact">
        <span className="label">Prefer to reach HR directly?</span>
        <CareersContact whatsappMessage="Hi, I have a question about a career opportunity at My Digital Savvy." />
      </div>
    </section>
  );
}
