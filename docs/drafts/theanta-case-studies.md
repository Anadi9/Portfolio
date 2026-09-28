# theanta.com case studies: draft copy

Drafted for theanta.com. Its source repo (Vite + TypeScript + React + shadcn +
Tailwind + Supabase) is not on this machine, so nothing is built there yet.
Visual system when it is: near-black / crimson, Space Grotesk + JetBrains Mono.
The pages must be prerendered, or crawlers and link previews see an empty
`<div id="root">`.

Same honesty rules as anadithakur.in: measured numbers only, public material
only, and nothing shown as an ANTA engagement that ANTA didn't deliver.

---

## 1. Studio build (flagship): Signal

**Route:** `/work/signal` · **`<title>`:** Signal: an AI lead system that shows its reasons
**Meta description:** How ANTA built Signal: leads scored 0–100 with the evidence beside the number, and first emails drafted from that evidence for a person to approve.

**Context strip:** Studio build · 2025 · Next.js · FastAPI · Claude API · Supabase · antasignal.vercel.app (login required)

### The problem
Founders doing their own outbound lose hours on leads that were never a fit,
then write every first email from scratch. Lead tools hand over a list and a
confidence percentage nobody can question, so the list gets thrown away.

### What had to be learned
- The Claude API: a score and its reason back as structured output, with the
  model held to evidence it was given.
- FastAPI for the pipeline, and keeping a scraper-fed system honest when a
  source fails.
- Scoring design: what a score has to carry for a person to act on it.

### What was built, and why
1. **A score has to carry its reason.** The evidence sits beside the number, in
   the lead's own words. You argue with the signal, not the digit.
2. **Evidence first, prose second.** The draft is written only from what the
   scrape can quote back, so the opener names the job they posted.
3. **It writes a draft, not a send.** Claude fills a review queue; a person
   decides what goes out.
4. **Failures stay visible.** The run log shows each scraper failure instead of
   retrying quietly.

### Where it stands
Signal has not been used for live outreach, so there are no reply rates or
pipeline numbers. Every lead carries its score and evidence, and every draft
waits for a person.

### CTA
**Lead magnet:** one-page "AI system blueprint" PDF (architecture + the four
decisions above) → **Book a scoping call.**
`[PENDING: the PDF isn't made; where the email capture goes]`

`[PENDING: the brief describes an Apollo → Clay → Claude (ICP score, 7/10
threshold) → HubSpot → Lemlist design. The published portfolio describes five
scraped sources. Confirm which pipeline this page should describe.]`

---

## 2. Founder's track record ("Before ANTA")

Intro line: *Before ANTA, Anadi built production web and mobile products for
clients while employed at [employers]. These were delivered there, not by ANTA.*

Each card: `Client project` · client · Delivered at `[employer]` · role · one line.

| Card | One line | Waiting on |
|---|---|---|
| **ZEISS Microscopy** (enterprise scale) | One React component system for every ZEISS light microscope line, with content that ships without a deploy. | permission to name ZEISS; employer (ZenQua vs Precious Infosystem); role; dates |
| **IoT Industry** (operational data into a usable system) | Live factory sensor data streamed into reusable charts and tables a manager can read at a glance. | permission; employer; role; dates |
| **Sonee Sports** (mobile commerce, end to end) | A sports store and loyalty app built from scratch in React Native for iOS and Android. | permission; employer; store links; role; dates; source for any metric |

Card CTA: *Have a system like this to build?* → **Book a scoping call.**

The full long-form copy for these three is in `src/data/caseStudies.ts` on
anadithakur.in (slugs `zeiss-microscopy`, `iot-industry`, `sonee-sports`) and
can be reused with the CTA swapped.
