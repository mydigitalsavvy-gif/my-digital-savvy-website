import type { HomeContent } from "@/types/home";

/**
 * Static homepage content, transcribed 1:1 from my-digital-savvy-v2.html.
 * This is the parity baseline. A WordPress adapter will later return this
 * same shape (see lib/content/home.ts) and the components won't change.
 *
 * Nothing here is invented. Items the reference itself flags for
 * verification are marked CONFIRM and must be checked before launch.
 */
export const homeContent: HomeContent = {
  nav: {
    homeHref: "/#top",
    links: {
      home: { label: "Home", href: "/#top" },
      services: { label: "Services", href: "/#services" },
      about: { label: "About Us", href: "/#about" },
      blog: { label: "Blog", href: "/#blog" },
      contact: { label: "Contact Us", href: "/#contact" },
    },
    cta: { label: "Book a free audit", href: "/#contact" },
    megaLabel: "Nine services, one team",
    megaTitle: "What we do",
  },

  hero: {
    eyebrow: "Digital marketing agency  ·  Nagpur, Maharashtra",
    headlineLead: "Marketing that pays for itself in",
    rotorWords: [
      { word: "hospitality", color: "#43FF4C" },
      { word: "education", color: "#4DAAFF" },
      { word: "trading", color: "#D42DF5" },
      { word: "jewellery", color: "#EB1C52" },
      { word: "real estate", color: "#43FF4C" },
    ],
    rotorInitialLabel: "Show hospitality work — click to filter",
    sub: [
      "We run ",
      { b: "Meta Ads" },
      ", build the site the ads land on, and write the content that keeps people coming back — for hotels, coaching academies, jewellers and builders across Maharashtra. One team, one thread, no handoffs.",
    ],
    primaryCta: { label: "Get your free audit", href: "#contact" },
    secondaryCta: { label: "See what we do", href: "#services" },
  },

  clients: [
    "Hotel Sunrise",
    "Garbha Sanskar Academy",
    "House of Trader Academy",
    "Farm Villa 007",
    "Aura Jewels",
    "The Plan C",
    "Sansa",
    "Vidyadoot Career Institute",
    "Archi Builders",
    "1 to 1 Home Tutors",
    "Tejaswi Trades",
  ],

  results: {
    heading: "Results, not promises",
    label: "Every number below is publicly verifiable",
    facts: [
      { countTo: 185, suffix: "+", label: "Clients served" },
      { countTo: 8, suffix: "+", label: "Years of experience" },
      { countTo: 320, suffix: "+", label: "Five-star reviews" },
      {
        countTo: null,
        display: "4.9",
        suffix: "",
        label: "Average Google rating",
      },
      // CONFIRM: 98% satisfaction is flagged in the reference for verification.
      { countTo: 98, suffix: "%", label: "Client satisfaction" },
    ],
    note: "Review and rating figures are verifiable across our two Google Business listings, not screenshots we control.",
  },

  services: {
    heading: "What we do",
    label: "Nine services, one focused team",
    menuHref: "/#services",
    // Order = the services section's solar system, by position (01 Sun,
    // 02 Mercury … 09 Neptune), matched to the portfolio site's planets:
    // Mercury SMO, Venus SMM, Earth SEO, Mars Google Ads, Jupiter graphic
    // design, Saturn website, Uranus video, Neptune YouTube; the Sun (the
    // logo there) holds the remaining service. Numbers follow the order;
    // menuColor keeps the menu's cyan/green/blue/magenta rhythm by position.
    items: [
      {
        slug: "local-seo-gmb-optimization",
        number: "01",
        name: "Local SEO & GMB Optimization",
        menuDescription: "Show up first for customers searching in your city.",
        menuColor: "dot",
        color: "dot",
        titleLines: ["Local SEO &", "GMB Optimization"],
        sub: "We optimise your Google Business Profile and local listings so customers in your city find you first.",
        how: "Google Business Profile and local listings optimised for map and “near me” searches.",
        deliverables: [
          "Google Business Profile",
          "Local Citations",
          "Map Rankings",
          "Reviews",
        ],
        outcome: "Customers in your own city finding you before a competitor.",
        cta: { label: "Audit my listings →", href: "#audit" },
        caseLink: { label: "See how we work →", href: "#case-studies" },
        icon: {
          shapes: [
            {
              type: "path",
              d: "M60 12 C42 12 28 26 28 44 C28 68 60 108 60 108 C60 108 92 68 92 44 C92 26 78 12 60 12 Z",
            },
            { type: "circle", cx: 60, cy: 44, r: 14, fill: true },
          ],
        },
      },
      {
        slug: "social-media-management",
        number: "02",
        name: "Social Media Management",
        menuDescription:
          "Consistent posting and content calendars, handled for you.",
        menuColor: "green",
        color: "green",
        titleLines: ["Social Media", "Management"],
        sub: "Consistent posting, community management and content calendars across all your platforms.",
        how: "Content calendars, community replies and scheduling, run consistently across every platform.",
        deliverables: [
          "Content Calendar",
          "Community Mgmt",
          "Scheduling",
          "Analytics",
        ],
        outcome:
          "A brand that stays active and relevant without it falling on you.",
        cta: { label: "Audit my socials →", href: "#audit" },
        caseLink: { label: "See how we work →", href: "#case-studies" },
        icon: {
          shapes: [
            { type: "rect", x: 12, y: 22, width: 96, height: 76, rx: 4 },
            { type: "path", d: "M12 42 L108 42" },
            { type: "path", d: "M40 22 L40 42 M80 22 L80 42" },
            {
              type: "rect",
              x: 24,
              y: 56,
              width: 16,
              height: 16,
              rx: 2,
              fill: true,
            },
            {
              type: "rect",
              x: 52,
              y: 56,
              width: 16,
              height: 16,
              rx: 2,
              fill: true,
            },
            { type: "rect", x: 24, y: 78, width: 16, height: 14, rx: 2 },
            {
              type: "rect",
              x: 52,
              y: 78,
              width: 16,
              height: 14,
              rx: 2,
              fill: true,
            },
            { type: "rect", x: 80, y: 56, width: 16, height: 16, rx: 2 },
          ],
        },
      },
      {
        slug: "social-media-marketing",
        number: "03",
        name: "Social Media Marketing",
        menuDescription:
          "Paid and organic campaigns across Instagram and Facebook.",
        menuColor: "blue",
        color: "dot",
        titleLines: ["Social Media", "Marketing"],
        sub: "Paid and organic campaigns across Instagram and Facebook designed to grow your reach, engagement and customer base.",
        how: "Creative, audience targeting and weekly optimisation, handled end-to-end by our own team.",
        deliverables: [
          "Instagram Ads",
          "Facebook Ads",
          "Audience Targeting",
          "Campaign Strategy",
        ],
        outcome:
          "A steadily growing audience that actually converts, not just follows.",
        cta: { label: "Audit my social ads →", href: "#audit" },
        caseLink: { label: "See how we work →", href: "#case-studies" },
        icon: {
          shapes: [
            { type: "rect", x: 30, y: 16, width: 60, height: 88, rx: 8 },
            { type: "circle", cx: 60, cy: 88, r: 5, fill: true },
            { type: "path", d: "M42 40 L78 40 M42 52 L78 52" },
            { type: "circle", cx: 44, cy: 68, r: 8, fill: true },
            { type: "circle", cx: 60, cy: 68, r: 8, fill: true },
            { type: "circle", cx: 76, cy: 68, r: 8, fill: true },
          ],
        },
      },
      {
        slug: "search-engine-optimization",
        number: "04",
        name: "Search Engine Optimization",
        menuDescription: "On-page SEO, technical fixes and content strategy.",
        menuColor: "magenta",
        color: "blue",
        titleLines: ["Search Engine", "Optimization"],
        sub: "We optimise your website to rank higher on Google through on-page SEO, technical fixes, content strategy and quality backlinks.",
        how: "On-page fixes, technical cleanup, content strategy and quality backlinks, worked on continuously.",
        deliverables: [
          "On-page SEO",
          "Technical SEO",
          "Link Building",
          "Keyword Research",
        ],
        outcome:
          "Higher rankings that put you ahead of competitors chasing the same keywords.",
        cta: { label: "Audit my SEO →", href: "#audit" },
        caseLink: { label: "See how we work →", href: "#case-studies" },
        icon: {
          shapes: [
            { type: "circle", cx: 50, cy: 50, r: 30 },
            { type: "path", d: "M72 72 L100 100", strokeLinecap: "round" },
            {
              type: "path",
              d: "M36 60 L44 46 L54 54 L66 36 L70 44",
              fill: true,
            },
          ],
        },
      },
      {
        slug: "search-engine-marketing",
        number: "05",
        name: "Search Engine Marketing",
        menuDescription: "Google Ads in front of people already searching.",
        menuColor: "dot",
        color: "magenta",
        titleLines: ["Search Engine", "Marketing"],
        sub: "Google Ads campaigns that put your business in front of people actively searching for what you offer.",
        how: "Campaigns built around tight budget control and clear monthly reporting.",
        deliverables: [
          "Google Ads",
          "PPC",
          "Display Ads",
          "Shopping Campaigns",
        ],
        outcome:
          "Qualified traffic from people already searching for what you offer.",
        cta: { label: "Audit my ad spend →", href: "#audit" },
        caseLink: { label: "See how we work →", href: "#case-studies" },
        icon: {
          shapes: [
            { type: "rect", x: 10, y: 18, width: 100, height: 64, rx: 4 },
            { type: "path", d: "M10 36 L110 36" },
            { type: "rect", x: 10, y: 18, width: 100, height: 18, fill: true },
            { type: "path", d: "M28 56 L72 56 M28 70 L52 70" },
            { type: "path", d: "M76 60 L104 76 L92 78 L86 98 Z", fill: true },
          ],
        },
      },
      {
        slug: "graphic-designing",
        number: "06",
        name: "Graphic Designing",
        menuDescription: "On-brand creative for every channel.",
        menuColor: "green",
        color: "dot",
        titleLines: ["Graphic", "Designing"],
        sub: "From social media creatives to brand collateral — visually sharp, on-brand designs for every channel.",
        how: "Creative built to your brand's own visual language, not a generic template.",
        deliverables: [
          "Social Creatives",
          "Brand Collateral",
          "Print Design",
          "Infographics",
        ],
        outcome:
          "Consistent, sharp visuals across every channel your audience sees you on.",
        cta: { label: "Audit my creative →", href: "#audit" },
        caseLink: { label: "See how we work →", href: "#case-studies" },
        icon: {
          shapes: [
            { type: "path", d: "M24 96 L16 104 L30 104 Z" },
            {
              type: "rect",
              x: 22,
              y: 24,
              width: 22,
              height: 74,
              rx: 4,
              transform: "rotate(-45 60 60)",
            },
            { type: "circle", cx: 90, cy: 30, r: 16 },
            { type: "circle", cx: 90, cy: 30, r: 7, fill: true },
            { type: "path", d: "M83 23 L97 37 M97 23 L83 37" },
          ],
        },
      },
      {
        slug: "website-development",
        number: "07",
        name: "Website Development",
        menuDescription: "Fast, mobile-first sites tracked from day one.",
        menuColor: "blue",
        color: "blue",
        titleLines: ["Website", "Development"],
        sub: "Fast, mobile-first websites built on WordPress and Elementor, tracked from day one.",
        how: "Built fast and mobile-first, with tracking wired in before the site ever goes live.",
        deliverables: [
          "WordPress",
          "Elementor",
          "Landing Pages",
          "Speed & Tracking",
        ],
        outcome:
          "A site that turns ad spend into measurable enquiries, not just visits.",
        cta: { label: "Audit my website →", href: "#audit" },
        caseLink: { label: "See how we work →", href: "#case-studies" },
        icon: {
          shapes: [
            { type: "rect", x: 8, y: 18, width: 104, height: 84, rx: 4 },
            { type: "path", d: "M8 38 L112 38" },
            { type: "circle", cx: 22, cy: 28, r: 4, fill: true },
            { type: "circle", cx: 36, cy: 28, r: 4, fill: true },
            {
              type: "path",
              d: "M38 56 L32 68 L38 80 M82 56 L88 68 L82 80",
              strokeLinecap: "round",
              strokeLinejoin: "round",
            },
            { type: "path", d: "M58 52 L54 84", strokeLinecap: "round" },
          ],
        },
      },
      {
        slug: "video-editing",
        number: "08",
        name: "Video Editing",
        menuDescription: "Reels and long-form video, edited to hold attention.",
        menuColor: "magenta",
        color: "green",
        titleLines: ["Video", "Editing"],
        sub: "Short-form reels, long-form videos and everything in between, edited to hold attention.",
        how: "Edited for the platform it's going on, matched to your brand tone, not a one-size cut.",
        deliverables: [
          "Reels Editing",
          "YouTube Videos",
          "Motion Graphics",
          "Colour Grading",
        ],
        outcome:
          "Content that holds attention long enough to actually be remembered.",
        cta: { label: "Audit my video content →", href: "#audit" },
        caseLink: { label: "See how we work →", href: "#case-studies" },
        icon: {
          shapes: [
            { type: "rect", x: 10, y: 28, width: 100, height: 64, rx: 4 },
            { type: "rect", x: 10, y: 28, width: 16, height: 64, fill: true },
            { type: "rect", x: 94, y: 28, width: 16, height: 64, fill: true },
            {
              type: "path",
              d: "M18 44 L18 56 M18 64 L18 76 M102 44 L102 56 M102 64 L102 76",
            },
            { type: "path", d: "M48 46 L80 60 L48 74 Z", fill: true },
          ],
        },
      },
      {
        slug: "youtube-management",
        number: "09",
        name: "YouTube Management",
        menuDescription: "End-to-end channel growth and management.",
        menuColor: "dot",
        color: "magenta",
        titleLines: ["YouTube", "Management"],
        sub: "End-to-end YouTube channel management, built to grow your subscriber base consistently.",
        how: "Strategy, SEO-optimised titles and descriptions, thumbnails and a consistent upload schedule.",
        deliverables: [
          "Channel Strategy",
          "SEO Titles",
          "Thumbnails",
          "Upload Scheduling",
        ],
        outcome:
          "A channel that keeps growing instead of stalling after a few uploads.",
        cta: { label: "Audit my channel →", href: "#audit" },
        caseLink: { label: "See how we work →", href: "#case-studies" },
        icon: {
          shapes: [
            { type: "rect", x: 8, y: 28, width: 104, height: 64, rx: 12 },
            { type: "path", d: "M46 46 L82 60 L46 74 Z", fill: true },
          ],
        },
      },
    ],
  },

  think: {
    headingLines: ["One team.", "No handoffs"],
    paragraphs: [
      [
        "Most agencies hand you between a strategist, a media buyer and an account manager reading a report someone else wrote. That's where budgets get lost in translation.",
      ],
      [
        "We don't work that way. The same people who run your ads build your site and write the content it needs — ",
        { b: "you talk to the people doing the work" },
        ", every time, not whoever picked up the account this quarter.",
      ],
    ],
    note: "— this is why the audit, the plan and the build all sit inside one team, not three vendors.",
  },

  growth: {
    label: "Scroll — one stage at a time",
    heading: "How the system connects",
    stages: [
      {
        railLabel: "Traffic",
        title: "Traffic",
        body: "People searching, scrolling, actively looking for what you offer.",
        color: "dot",
      },
      {
        railLabel: "Ads / SEO",
        title: "Ads & SEO",
        body: "Meta Ads, Google Ads and SEO put you in front of them.",
        color: "green",
      },
      {
        railLabel: "Website",
        title: "Website",
        body: "A fast, tracked site that answers the ad's exact promise.",
        color: "blue",
      },
      {
        railLabel: "Lead",
        title: "Lead",
        body: "A form, a call, a message — captured, not lost.",
        color: "magenta",
      },
      {
        railLabel: "WhatsApp / Sales",
        title: "WhatsApp & Sales",
        body: "Routed straight to your phone, in real time.",
        color: "green",
      },
      {
        railLabel: "Growth",
        title: "Growth",
        body: "More clients, more reviews, more budget to reinvest.",
        color: "dot",
      },
    ],
  },

  industries: {
    heading: "Industries we know",
    label: "Real clients, not a generic list",
    items: [
      {
        tag: "Hospitality",
        clients: "Hotel Sunrise · Farm Villa 007",
        color: "dot",
      },
      {
        tag: "Education",
        clients:
          "Garbha Sanskar Academy · Vidyadoot Career Institute · 1 to 1 Home Tutors",
        color: "green",
      },
      {
        tag: "Real estate & builders",
        clients: "Archi Builders",
        color: "blue",
      },
      { tag: "Jewellery", clients: "Aura Jewels", color: "magenta" },
      { tag: "Trading & retail", clients: "Tejaswi Trades", color: "dot" },
    ],
  },

  work: {
    heading: "Our work",
    label: "Click any planet to explore",
    href: "https://portfolio.mydigitalsavvy.com/",
    cta: "Explore the portfolio",
    ariaLabel: "Explore our portfolio (portfolio.mydigitalsavvy.com)",
    live: "Live · planets as of",
  },

  // PLACEHOLDER: preview of the case-study format, not a real case study.
  caseStudies: {
    heading: "Case studies",
    label: "The format, ahead of the first publish",
    badge: "Preview — not a live case study",
    steps: [
      {
        label: "Problem",
        text: "The specific challenge a real client brought to us.",
      },
      { label: "Strategy", text: "What we recommended, and why." },
      { label: "Execution", text: "What we actually built and ran." },
      {
        label: "Result",
        text: "The verified before-and-after numbers, once published.",
      },
    ],
    cta: { label: "Ask us for a walkthrough →", href: "#contact" },
  },

  about: {
    heading: "Who we are",
    label: "The team",
    lead: "My Digital Savvy is a digital marketing agency based in Nagpur, working with hospitality brands, coaching academies, builders and retailers across Maharashtra, Madhya Pradesh and Telangana — from Nagpur to Indore, Raipur, Hyderabad and Jabalpur.",
    // CONFIRM: verify this figure before launch (flagged in the reference).
    pullValue: "98",
    pullSuffix: "%",
    pullLabelLines: ["Client satisfaction", "across our engagements"],
    note: [
      "We are a small, senior team. When you hire us, ",
      { b: "you talk to the people doing the work" },
      " — not an account manager reading a report someone else wrote.",
    ],
  },

  blog: {
    heading: "Insights",
    label: "From the blog",
    intro:
      "Honest writing on what actually moves the needle for Indian businesses — recent posts cover Google Ads vs. Meta Ads, why agency-hopping resets your momentum, and what's actually working in SEO this year.",
    // Reference linked a non-existent blog.html. When the legacy path
    // resolver lands, point this at the live blog index /my-digital-savvy-blog/.
    cta: { label: "Read the blog", href: "/blog/" },
  },

  process: {
    heading: "How a project runs",
    label: "First 30 days",
    steps: [
      {
        number: "01",
        title: "Audit",
        body: "We open your ad account, site and analytics and tell you what's leaking. Free, and yours to keep either way.",
      },
      {
        number: "02",
        title: "Plan",
        body: "One goal, one budget, one set of creatives to test first. Written down so we're both looking at the same page.",
      },
      {
        number: "03",
        title: "Build",
        body: "Site, tracking and creative go live together. Nothing runs until we can measure what it did.",
      },
      {
        number: "04",
        title: "Report",
        body: "A weekly note in plain language: what we spent, what came back, what changes next week.",
      },
    ],
  },

  proof: {
    heading: "What clients say",
    label: "Google reviews",
    featured: {
      quote: [
        "Best digital marketing company in Nagpur. Team is very confident — give them the job and they deliver ",
        { em: "more" },
        " than expected.",
      ],
      name: "Harwinder Bhatia",
      source: "Google review",
    },
    rating: {
      value: "4.9",
      reviewCount: 320,
      // CONFIRM: replace with the real Google Maps review link (placeholder in the reference).
      href: "https://g.page/r/REPLACE_WITH_YOUR_GBP_REVIEW_LINK",
      ariaLabel: "320 five-star Google reviews — view on Google Maps",
      textBefore: "",
      textAfter: " five-star reviews across two Google Business listings.",
    },
    voices: [
      {
        quote: [
          '"I took social media marketing services and I got amazing response by the third month — all organic."',
        ],
        name: "Vinisha Ahuja",
        source: "Google review",
      },
      {
        quote: [
          "\"My Digital Savvy's web design team did an outstanding job on our website. The new design is ",
          { em: "sleek, modern, and user-friendly." },
          '"',
        ],
        name: "Shiv Naik",
        source: "Google review",
      },
      {
        quote: [
          '"They helped us reach a wider audience with ',
          { em: "smart, well-executed campaigns." },
          '"',
        ],
        name: "Piyush Lalwani",
        source: "Google review",
      },
      {
        quote: [
          "\"I've worked with several digital marketing agencies, but My Digital Savvy stands out. Their social media efforts ",
          { em: "doubled our follower count." },
          '"',
        ],
        name: "Santosh Yadav",
        source: "Google review",
      },
      {
        quote: [
          '"An exceptional partner in helping us navigate the digital marketing world — proactive, detail-oriented, and skilled."',
        ],
        name: "Devanshi Khandelwal",
        source: "Google review",
      },
    ],
    marqueeNames: [
      "Vinisha Ahuja ★★★★★",
      "Harwinder Bhatia ★★★★★",
      "Shiv Naik ★★★★★",
      "Piyush Lalwani ★★★★★",
      "Santosh Yadav ★★★★★",
      "Devanshi Khandelwal ★★★★★",
    ],
  },

  // CONFIRM: the reference flags every claim below for verification before launch.
  why: {
    heading: "Why My Digital Savvy",
    label: "12 reasons, one team",
    ariaLabel: "12 reasons to choose My Digital Savvy",
    items: [
      {
        title: "Free audit, no strings",
        body: "We open your ad account, site and analytics and tell you what's leaking — yours to keep either way.",
        color: "dot",
      },
      {
        title: "₹2Cr+ ad spend managed",
        body: "Real budgets across real industries — not theory borrowed from a case-study deck.",
        color: "green",
      },
      {
        title: "320+ five-star reviews",
        body: "Verifiable across two Google Business listings — not screenshots we control.",
        color: "blue",
      },
      {
        title: "50+ active clients",
        body: "Hospitality, education, trading, retail and real estate — across Maharashtra and beyond.",
        color: "magenta",
      },
      {
        title: "Weekly reporting, plain language",
        body: "What we spent, what came back, what changes next week — no jargon to hide behind.",
        color: "dot",
      },
      {
        title: "Tracking from day one",
        body: "Site, tracking and creative go live together, so every rupee of ad spend is measurable.",
        color: "green",
      },
      {
        title: "Creative refreshed on performance",
        body: "Not a fixed monthly schedule — we swap creative when it fatigues, not when the calendar says to.",
        color: "blue",
      },
      {
        title: "Leads land on WhatsApp",
        body: "Enquiries route straight to your phone in real time — not a weekly spreadsheet export.",
        color: "magenta",
      },
      {
        title: "Two offices, always reachable",
        body: "Ganeshpeth and Sadar — walk in, or reach us on WhatsApp the same day.",
        color: "dot",
      },
      {
        title: "Nagpur-based, pan-India reach",
        body: "Local enough to sit across the table, experienced enough to run your growth from anywhere.",
        color: "green",
      },
      {
        title: "One team, no handoffs",
        body: "The people who run your ads build your site and write your content — nothing gets lost between departments.",
        color: "blue",
      },
      {
        title: "You talk to who does the work",
        body: "No account manager reading a report someone else wrote — you get the people actually in your ad account.",
        color: "magenta",
      },
    ],
    cta: { label: "Claim your free audit →", href: "#contact" },
  },

  audit: {
    label: "No strings",
    heading: "Get a free digital audit",
    copy: "We open your ad account, site and analytics and tell you exactly what's leaking — free, and yours to keep either way.",
    cta: { label: "Get my free audit →", href: "#contact" },
  },

  contact: {
    label: "Next step",
    headingLines: ["Tell us what's", "not working"],
    email: "hello@mydigitalsavvy.com",
    whatsappDisplay: "+91 81491 05083",
    whatsappNumber: "918149105083",
    offices: [
      {
        label: "Ganeshpeth office",
        lines: [
          "Shop No 67, 1st Floor,",
          "Rahul Complex 2, Ganeshpeth,",
          "Nagpur 440018",
        ],
      },
      {
        label: "Sadar office",
        lines: [
          "15/16, NMC Complex, 1st Floor,",
          "J.B. Wing, Mangalwari,",
          "Sadar, Nagpur",
        ],
      },
    ],
  },

  footer: {
    copyright: "© 2026 My Digital Savvy",
    social: [
      {
        label: "Facebook",
        href: "https://www.facebook.com/profile.php?id=61553360870147",
      },
      { label: "Instagram", href: "https://www.instagram.com/mydigitalsavvy/" },
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/company/my-digital-savvy/",
      },
    ],
    tagline: "Digital marketing · Nagpur",
  },

  popup: {
    label: "Free 20-min call",
    titleLines: ["Ready to fix", "what's leaking"],
    copy: "Share your name and number — we'll message you on WhatsApp to lock in a free audit call.",
    needs: [
      "Meta Ads",
      "Website",
      "SEO / Google Ads",
      "Content & social",
      "Not sure yet",
    ],
    submitLabel: "Send on WhatsApp →",
    whatsappNumber: "918149105083",
  },
};
