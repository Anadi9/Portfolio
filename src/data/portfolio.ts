import signalShot from '@/assets/signal.webp';
import zeissShot from '@/assets/eiss.webp';
import iotiShot from '@/assets/ioti.webp';

/**
 * Signal's public URL.
 *
 * The root, not `/login`, since it 307s there itself, and linking the redirect
 * target would break the day a marketing page lands in front of it. The app
 * behind it is gated, which is why the case study carries the detail: a
 * recruiter who won't sign up still gets the whole story on the page.
 *
 * Empty here degrades to a dead "LINK PENDING" plate rather than a button that
 * goes nowhere.
 */
export const SIGNAL_HREF = 'https://antasignal.vercel.app/';

export const site = {
  name: 'Anadi Thakur',
  role: 'Senior UI / Full-Stack Engineer',
  email: 'anadithakur99@gmail.com',
  github: 'https://github.com/Anadi9',
  githubHandle: '/Anadi9',
  linkedin: 'https://www.linkedin.com/in/anadi-thakur-92163316b/',
  linkedinHandle: '/in/anadi-thakur-92163316b',
  resume: '/uploads/Anadi_Thakur_Resume.pdf',
  years: '05',
  releases: '18',
  clients: ['ZEISS', 'ZENQUA', 'PRECIOUS', 'YUGAM', 'SHETHINK', 'ORIONS'],
};

/**
 * Rail nav.
 *
 * `href` opts an item out of the in-page scrollspy: everything without one is a
 * section on the front page and is tracked by `usePortfolioMotion`, while an
 * item carrying an `href` is a real route and simply never lights up. NOTES
 * sits directly after SELECTED WORK, because the writing is the second thing worth
 * reading, not an afterthought pinned below CONTACT.
 */
export type NavItem = { id: string; label: string; href?: string };

export const nav: NavItem[] = [
  { id: 'home', label: 'HOME' },
  { id: 'work', label: 'SELECTED WORK' },
  { id: 'notes', label: 'NOTES', href: '/notes' },
  { id: 'journey', label: 'THE ROUTE HERE' },
  { id: 'stack', label: 'STACK' },
  { id: 'contact', label: 'CONTACT' },
];

export const marqueeItems = [
  'REACT', 'TYPESCRIPT', 'NEXT.JS', 'NODE.JS', 'FASTAPI', 'CLAUDE API',
  'GROQ', 'REACT NATIVE', 'POSTGRES', 'AEM', 'DOCKER', 'GCP',
];

export const strengths = [
  'SHIPPING FAST, ALONE',
  'DESIGN SYSTEMS',
  'PERFORMANCE BUDGETS',
  'LLM PLUMBING',
];

export type Project = {
  index: string;
  kind: string;
  tech: string[];
  /** Two lines: the title is set as a hard-broken display block. */
  title: [string, string];
  blurb: string;
  shot?: string;
  shotLabel: string;
  href?: string;
  /** Only the featured project carries one; it renders below the reel. */
  study?: CaseStudy;
};

/**
 * The long version of a project. The reel sells it in four lines; this is the
 * part an engineer actually reads.
 *
 * `moves` are the decisions worth defending, in build order; `results` are
 * facts about the shipped thing rather than growth claims, because a portfolio
 * that quotes conversion rates for a solo project invites the obvious question.
 */
export type CaseStudy = {
  /** What the thing is actually called once you're inside it. */
  product: string;
  role: string;
  span: string;
  /** One line: what was actually wrong before it existed. */
  problem: string;
  moves: { n: string; head: string; body: string }[];
  results: { value: string; unit: string; note: string }[];
  /** Cost of the honest version; every real project has one. */
  tradeoff: string;
};

export const projects: Project[] = [
  {
    index: '01',
    kind: 'FEATURED',
    tech: ['NEXT.JS', 'FASTAPI', 'CLAUDE API', 'SUPABASE'],
    title: ['Signal', 'AI Lead Radar'],
    blurb:
      "Scrape → score → outreach. A 0–100 model with a stated reason for the score, and a Claude-written first email you'd actually be willing to send.",
    shot: signalShot,
    shotLabel: 'SIGNAL · AI LEAD RADAR',
    href: SIGNAL_HREF || undefined,
    study: {
      product: 'ANTA Lead Radar',
      role: 'Solo: product, pipeline, interface',
      span: '2025, running daily',
      problem:
        'Lead tools hand you a list and a confidence percentage nobody can interrogate. You either trust the number or you throw the list away, and everyone throws the list away.',
      moves: [
        {
          n: '01',
          head: 'A score has to carry its reason',
          body:
            'The evidence sits in the table beside the number, in the lead\'s own words: "hiring a Buyer, Indirect on LinkedIn", "active manufacturer found via Google Maps". You argue with the signal, not the digit, and when you disagree, you already know which input to fix.',
        },
        {
          n: '02',
          head: 'Evidence first, prose second',
          body:
            'The scrape keeps only what can be quoted back, and the draft is allowed to write from that and nothing else. So the opener names the job they posted last week instead of admiring their commitment to excellence.',
        },
        {
          n: '03',
          head: 'It writes a draft, not a send',
          body:
            'Claude fills a review queue: subject, body, two variants to choose between. Moving a lead to contacted is a human pressing a button. The automation is worth having precisely because it stops one step short.',
        },
      ],
      results: [
        { value: '0–100', unit: 'SCORED', note: 'each score keeps the hiring signal that produced it' },
        { value: '5', unit: 'SOURCES', note: 'LinkedIn, job boards, Crunchbase, Google Maps, remote boards' },
        { value: '7', unit: 'STAGES', note: 'new → analysed → contacted → replied → meeting → proposal → client' },
      ],
      tradeoff:
        "It is slower per lead than the tools that don't explain themselves, and the scrapers need minding; the run log keeps its failures visible rather than quietly retrying. That is the trade, and it was made on purpose.",
    },
  },
  {
    index: '02',
    kind: 'ENTERPRISE',
    tech: ['REACT', 'AEM', 'DESIGN SYSTEM'],
    title: ['ZEISS', 'Microscopy'],
    blurb:
      'A product platform for scientific light microscopes. Reusable components wired to AEM content APIs, so marketing ships copy without waiting on a deploy.',
    shot: zeissShot,
    shotLabel: 'ZEISS PRODUCT PAGE',
    href: 'https://www.zeiss.com/microscopy/us/products/light-microscopes.html',
  },
  {
    index: '03',
    kind: 'REALTIME',
    tech: ['REACT', 'NODE', 'WEBSOCKETS'],
    title: ['IOT', 'Industry'],
    blurb:
      'A factory-floor dashboard streaming live sensor data into reusable chart and table components, without melting the browser tab it lives in.',
    shot: iotiShot,
    shotLabel: 'IOT FLOOR DASHBOARD',
    href: 'https://ioti.io/',
  },
];

export type Milestone = {
  year: string;
  title: string;
  body: string;
  meta: string;
  tone?: 'ink' | 'accent';
  /** Marks the meta line as an availability claim; gets the status hue. */
  status?: boolean;
};

export const milestones: Milestone[] = [
  {
    year: '20',
    title: 'First real UI job',
    body: 'Frontend intern at Enonity Labs. Learned that "just move it 4px" is a real request and usually the right one.',
    meta: 'ENONITY LABS · REACT.JS',
  },
  {
    year: '21',
    title: 'Two internships, one year',
    body: "Shethink and Orions IT. Picked up React Native and the habit of reading someone else's API docs before complaining about them.",
    meta: 'SHETHINK · ORIONS · REACT NATIVE',
  },
  {
    year: '22',
    title: 'Shipping to real users',
    body: 'Yugam Technologies. Cross-platform apps on the MERN stack, Redux everywhere, and my first taste of state that outgrows its design.',
    meta: 'YUGAM · MERN · REDUX',
  },
  {
    year: '23',
    title: 'Enterprise, and its constraints',
    body: 'Precious Infosystem, building for ZEISS. Component libraries that non-technical people could actually use. Accessibility stopped being optional.',
    meta: 'PRECIOUS INFOSYSTEM · ZEISS · AEM',
    tone: 'ink',
  },
  {
    year: '24',
    title: 'Leading the frontend',
    body: 'ZenQua. Owned web and mobile frontends, split the bundle, lazy-loaded the rest, and watched the load graph finally behave.',
    meta: 'ZENQUA · REACT · REACT NATIVE',
  },
  {
    year: '25',
    title: 'Out on my own, into LLMs',
    body: 'Independent. Scoping, architecture, deployment, and building Signal, where Claude does the writing and I do the plumbing.',
    meta: 'FREELANCE · CLAUDE · GROQ · FASTAPI',
  },
  {
    year: '26',
    title: 'Looking for a team again',
    body: 'Freelance taught me ownership. Now I want people to argue with about component APIs. Senior UI / full-stack, remote.',
    meta: 'AVAILABLE NOW',
    tone: 'accent',
    status: true,
  },
];

export type StackColumn = {
  heading: string;
  items: string[];
  /** Daily-driver columns get the accent treatment. */
  strong: boolean;
  /** The honest rating, 0–1. Drives the meter that draws under the heading. */
  level: number;
};

export const stack: StackColumn[] = [
  {
    heading: 'FRONTEND · DAILY',
    items: ['React', 'TypeScript', 'React Native', 'Tailwind · MUI', 'Redux · Zustand'],
    strong: true,
    level: 0.95,
  },
  {
    heading: 'BACKEND · DAILY',
    items: ['Node.js · Express', 'FastAPI', 'PostgreSQL', 'MongoDB', 'REST · GraphQL'],
    strong: true,
    level: 0.85,
  },
  {
    heading: 'AI / LLM · DAILY',
    items: ['Claude API', 'Groq SDK', 'LLaMA 3.3', 'Prompt design', 'Eval loops'],
    strong: true,
    level: 0.8,
  },
  {
    heading: 'WORKING KNOWLEDGE',
    items: ['GCP · Azure', 'Docker', 'AEM · Strapi', 'Firebase', 'Figma'],
    strong: false,
    level: 0.55,
  },
];
