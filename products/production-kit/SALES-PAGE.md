# The Production Kit

**Make your AI coding tool write code that survives real users, and check it yourself before launch.**

For Claude Code, Cursor, Lovable and Bolt. Built for React / Next.js + Supabase apps.

---

## Who it's for

You built your app with an AI coding tool. It works on your machine. But:

- you're not sure if strangers can read your database
- sign-up emails don't arrive, or the link sends people to localhost
- pages 404 when someone refreshes
- every fix the AI makes seems to break something else
- your site doesn't show up in Google, and link previews are blank

You don't need to become a senior engineer. You need your AI tool to follow the rules a senior engineer would give it, and a way to check the result.

This kit is for non-technical and semi-technical founders who build with Claude Code, Cursor, Lovable, Bolt or v0 and run on Supabase and Vercel (or similar).

## What's inside

**Project rules for your AI tool**
- `CLAUDE.md` for Claude Code: security, Supabase Row Level Security, auth, environment variables, deployment, database changes, error handling, performance, SEO, and how to make changes without breaking working code.
- Cursor rules (`.mdc`): the same rules, set up to load automatically.
- A condensed version sized to paste into Lovable or Bolt project knowledge.

**Five Claude Code skills** (step-by-step procedures the agent follows)
- **Supabase RLS audit**: finds tables anyone can read or write, writes the fixes, and tests as a logged-out visitor and as a second user.
- **Pre-deploy check**: env vars, build, routing, auth redirect URLs, error pages, console errors, Lighthouse.
- **Auth flow fix**: diagnoses sign-up, email confirmation, login, password reset, OAuth and session problems.
- **AI visibility**: gets a client-rendered app readable by Google, social previews and AI crawlers, and proves it with curl.
- **Safe change**: the discipline for fixing things without breaking other things.

**Checklists**
- Launch checklist: 11 areas, from data security to rollback, as checkboxes.
- Security checklist: every item says how to check it.

**SQL you can run today**
- A read-only RLS status report: every table, RLS on/off, policy counts, risky views and functions, public buckets, missing indexes.
- Example policies for the common patterns: owner-only data, public profiles, team workspaces, per-user file storage.

Plain Markdown and SQL files. Install takes a few minutes; instructions included.

## What it's not

- Not a course or video series. It's files you drop into your project.
- Not a guarantee. It makes your AI tool much less likely to ship the common mistakes, and gives you the checks to catch the rest. The checklists only work if you run them.
- Not a substitute for a professional review if you handle payments at scale, health data or other sensitive information.
- Not written for every stack. It's specific to React / Next.js with Supabase, deployed on Vercel or similar. Much of it applies elsewhere, but the SQL and auth details are Supabase-specific.

## FAQ

**I'm not technical. Can I use this?**
Yes, if you can copy files into your project or paste text into your tool's settings. The skills tell the AI what to do; the checklists tell you what to click and what you should see.

**Which tools does it work with?**
Claude Code (rules + skills), Cursor (rules; skills can be referenced in chat), Lovable and Bolt (condensed rules pasted into project knowledge). Tools that read `AGENTS.md` can use the main rules file too.

**Will it fix my existing app?**
The rules apply to new work. The skills and checklists are for auditing and fixing what's already there: run the RLS audit and pre-deploy check first.

**Is the SQL safe to run?**
`rls-status.sql` only reads; it changes nothing. `example-policies.sql` creates tables and policies, so read the comments, rename things to match your schema, and run only the parts you need.

**Does it work with Firebase / another backend?**
The deployment, change discipline and SEO parts do. The database and auth parts are written for Supabase.

**Do I get updates?**
[OWNER TO DECIDE: e.g. "Yes, free updates to this version via the same download link."]

**Refunds?**
[OWNER TO DECIDE: state your refund policy here.]

## Who made it

Anadi Thakur, a senior full-stack engineer with 4+ years building React, Next.js, React Native and Node apps, running Supabase/Postgres in production, deploying on Vercel, and working on performance and technical SEO. These days a lot of that work is fixing apps built with Lovable, Bolt, Cursor and v0. This kit is the set of rules and checks used in that work, written so your AI tool can follow them.

## Would rather have it fixed for you?

Get a free audit of your app at **https://anadithakur.in/rescue/audit**.

---

**Price:** [OWNER TO SET: $29–79]
