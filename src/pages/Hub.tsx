import { Seo } from "@/components/Seo";
import { PaperPage, SiteHeader } from "@/components/site/kit";
import {
  About,
  AuditChecklist,
  Blog,
  BugDemo,
  Faq,
  FreeTools,
  Hero,
  Pricing,
  Process,
  SampleReport,
  Services,
  TrackingBoard,
} from "@/components/home/sections";
import { BitGuide } from "@/components/home/BitGuide";
import { faq, offers } from "@/data/bitsQuest";
import { BUSINESS_TAGLINE, faqPage, graph, service } from "@/lib/schema";
import "@/styles/home.css";

/**
 * `/`: the Bit's Quest homepage. One promise ("your app, made
 * production-ready") and three services: Fix, Build with AI, Keep it running.
 * Search & AI visibility and privacy are two of the audit's three areas, with
 * their own pages linked from the checklist.
 *
 * It carries the site's entity graph: it is the page every other page's
 * `@id`s resolve to.
 */

const PAGE = "home";
const TITLE = "Your app, made production-ready · Anadi Thakur";
const DESCRIPTION =
  "Fix a broken or risky app, add AI that holds up, and keep it running. Fixed prices, and your first bug found free on video in 24 hours.";

const jsonLd = graph(
  [
    {
      "@type": "WebSite",
      "@id": "https://anadithakur.in/#website",
      url: "https://anadithakur.in/",
      name: "Anadi Thakur",
      description: BUSINESS_TAGLINE,
      publisher: { "@id": "https://anadithakur.in/#business" },
    },
    service({
      path: "/production-ready",
      name: "Fix it or get it launch-ready",
      description:
        "A paid production audit, then fixed-price sprints that make a broken or risky app stable, secure and launch-ready.",
      serviceType: "Production fixes for web and mobile apps",
      offers: offers.fix,
    }),
    service({
      path: "/build-with-ai",
      name: "Build with AI",
      description:
        "AI features with guardrails and cost limits, or a complete MVP, at a fixed quote.",
      serviceType: "AI feature and MVP development",
      offers: offers.build,
    }),
    service({
      path: "/care",
      name: "Care plan",
      description:
        "Monitoring, a monthly health review, small fixes and a quarterly visibility and privacy re-check.",
      serviceType: "Application maintenance",
      offers: offers.care,
    }),
    faqPage(faq.items, "https://anadithakur.in/#faq"),
  ],
  true,
);

const Hub = () => (
  <>
    <Seo
      title={TITLE}
      description={DESCRIPTION}
      path="/"
      type="website"
      jsonLd={jsonLd}
    />
    <PaperPage header={<SiteHeader page={PAGE} />}>
      <Hero />
      <BugDemo />
      <Services />
      <SampleReport />
      <Process />
      <AuditChecklist />
      <Pricing />
      <TrackingBoard />
      <FreeTools />
      <Blog />
      <About />
      <Faq />
      <BitGuide />
    </PaperPage>
  </>
);

export default Hub;
