---
name: ai-visibility
description: Make a client-rendered React/Vite app (Lovable, Bolt, v0 exports etc.) visible to Google, social link previews and AI crawlers like ChatGPT, Claude and Perplexity. Use when the user says their site doesn't show up in Google or AI answers, link previews are blank or wrong, pages have the same title everywhere, or they ask about SEO, prerendering, SSR, sitemap, robots.txt, meta tags or structured data.
---

# AI and search visibility for client-rendered apps

## The problem, in one test

A Vite/React SPA sends every visitor the same near-empty `index.html` (`<div id="root"></div>` plus a script tag). Content appears only after JavaScript runs. Google can render JavaScript, but with a delay and not always completely. Most AI crawlers and every social preview bot (Slack, X, LinkedIn, WhatsApp, iMessage) read the raw HTML and don't run JavaScript, so they see an empty page.

Start by showing the user the problem on their live site:

```bash
curl -s https://example.com/pricing | grep -iE "<title>|<meta name=\"description\"|<h1"
curl -s https://example.com/pricing | wc -c
```

If the title is the same on every route, there's no `<h1>`, and the page text you see in the browser isn't in the output, crawlers without JS see nothing. Record this "before" output.

## Step 1: Decide which pages need to be visible

- Public, content pages: home, pricing, features, about, blog, docs, landing pages, public profiles or listings. These need real HTML.
- Logged-in app screens: dashboard, settings, anything behind auth. These should be `noindex` and don't need prerendering.

If only a handful of public pages matter, prerendering is enough. If there are thousands of dynamic public pages (listings, user profiles), you need SSR or build-time generation from the database.

## Step 2: Choose an approach (least disruptive first)

1. **Build-time prerendering of the existing SPA.** Keep the app; at build time, render each public route to static HTML. Options: `vite-react-ssg` (for React Router apps; requires restructuring routes into its format), `vite-plugin-prerender` or a small Puppeteer/Playwright script that loads each route from `vite preview` and saves the rendered HTML to `dist/<route>/index.html`. Check the chosen package's current maintenance status before adopting it; several older ones (e.g. `react-snap`) are unmaintained.
2. **Move the marketing pages to a static site generator** (Astro, or Next.js static export) and keep the app as an SPA under `/app` or a subdomain. Good when the marketing site and the app are clearly separate.
3. **Migrate to Next.js (App Router)** with server rendering/static generation. The most robust, but a real migration: routing, data fetching, env var names (`VITE_` to `NEXT_PUBLIC_`) and Supabase auth (`@supabase/ssr`) all change. Only recommend it if the user is ready for that project.
4. Dynamic rendering services (serving bots a prerendered snapshot) work but add a moving part and a monthly cost; treat as a fallback.

Explain the trade-off and get the user's choice before starting options 2 or 3.

With any prerendering approach on Vercel, make sure the SPA rewrite doesn't override the generated files. Vercel serves existing static files before applying rewrites, so `dist/pricing/index.html` wins over the `/(.*)` to `/index.html` rewrite. Confirm by curling the route after deploy.

## Step 3: Per-route metadata

Every public route needs, in the served HTML:
- a unique `<title>` (roughly 50–60 characters) and `<meta name="description">` (roughly 120–160 characters)
- `<link rel="canonical" href="https://example.com/route">` (absolute URL, one canonical host: pick `www` or apex)
- Open Graph: `og:title`, `og:description`, `og:url`, `og:type`, `og:image` (absolute URL, 1200x630 works well), plus `twitter:card` = `summary_large_image`
- one `<h1>` with the page's main topic, real text content, and `<a href>` links between pages (crawlers don't click buttons)

In a React SPA, manage head tags with React 19's built-in `<title>`/`<meta>` support or `react-helmet-async`, and make sure the prerender step captures them. In Next.js use `export const metadata` / `generateMetadata`.

Logged-in routes: `<meta name="robots" content="noindex">`.

## Step 4: robots.txt and sitemap.xml

`public/robots.txt`:

```
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /settings

Sitemap: https://example.com/sitemap.xml
```

- Don't disallow `/assets/` or JS/CSS files; Google needs them to render.
- If the user wants to allow or block specific AI crawlers, the user-agent tokens include `GPTBot` and `OAI-SearchBot` (OpenAI), `ClaudeBot` and `Claude-SearchBot` (Anthropic), `PerplexityBot`, and `Google-Extended` (controls use for Gemini training, not Google Search). Blocking the search-oriented bots removes the site from those assistants' answers. Check each vendor's current docs, since these names change.
- Also check the host and CDN: Cloudflare and some hosts have "block AI bots" toggles that override robots.txt.

`public/sitemap.xml` listing every public, canonical URL (absolute, `https`). Generate it at build time from the route list (and from the database for dynamic pages) rather than maintaining it by hand. Submit it in Google Search Console and Bing Webmaster Tools (Bing's index feeds some AI search products).

## Step 5: Structured data (JSON-LD)

Add a `<script type="application/ld+json">` block to relevant pages, in the prerendered HTML. Use the type that matches the page and only describe what's actually on the page:
- Home: `Organization` (name, url, logo, sameAs social profiles) and `WebSite`
- Product/SaaS: `SoftwareApplication` or `Product`
- Articles: `Article` / `BlogPosting` (headline, datePublished, author)
- FAQ sections: `FAQPage` (the questions and answers must be visible on the page)

Validate with Google's Rich Results Test and the Schema.org validator.

## Step 6: Verify with curl

After deploying, for each public route:

```bash
URL=https://example.com/pricing
curl -s "$URL" | grep -iE "<title>|name=\"description\"|rel=\"canonical\"|og:title|<h1"
curl -s -A "GPTBot" "$URL" | grep -ic "a phrase from the page body"   # expect 1 or more
curl -sI "$URL" | head -1                                             # expect 200, not 404 or a redirect chain
curl -s https://example.com/robots.txt
curl -s https://example.com/sitemap.xml | head -20
```

Also check that a nonexistent route returns a 404 status rather than 200 with the app shell, where the host allows it (with an SPA catch-all rewrite, it returns 200; that's a "soft 404" and acceptable only if the page sets `noindex`).

Then in Google Search Console: URL Inspection > Test live URL > View tested page, to see what Google rendered. Paste the URL into a Slack or LinkedIn post draft to check the preview card.

## Report

Before/after curl output for key routes, the approach chosen and why, files added or changed, and what the user must do (submit sitemap, verify Search Console, check CDN bot settings). Be honest that indexing and AI citations take time and aren't guaranteed; this work makes the site readable, not ranked.
