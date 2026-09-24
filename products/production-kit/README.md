# The Production Kit

by Anadi Thakur

Rules, skills and checklists that make your AI coding tool (Claude Code, Cursor, Lovable, Bolt) write safer production code for React/Next.js + Supabase apps, plus checklists so you can verify the result yourself.

It's for founders and builders who ship with AI tools and whose app works on localhost but breaks, leaks or stalls once real users arrive.

## What's inside

| File | What it does |
|---|---|
| `CLAUDE.md` | Project instructions for Claude Code: security, Supabase RLS, auth, env vars, deployment, data, errors, performance, SEO, and how to change code without breaking it. |
| `skills/` | Five Claude Code skills: step-by-step procedures the agent follows when the task comes up. |
| `cursor-rules/` | The same core rules as Cursor `.mdc` rule files. |
| `lovable-bolt-instructions.md` | A condensed version (about 2,100 characters) to paste into Lovable or Bolt. |
| `checklists/launch-checklist.md` | Everything to verify before real users, grouped by area. |
| `checklists/security-checklist.md` | Security checks, each with how to check it. |
| `sql/rls-status.sql` | Read-only queries: which tables have RLS, every policy, risky views/functions, storage, missing indexes. |
| `sql/example-policies.sql` | Copyable RLS policies: owner-only, public read/own write, team membership, per-user storage folders. |

The skills:
- **supabase-rls-audit**: find tables anyone can read or write, fix the policies, and test as a logged-out visitor and as a second user.
- **pre-deploy-check**: env vars, build, SPA routing, auth redirect URLs, error pages, console errors, Lighthouse basics.
- **auth-flow-fix**: diagnose sign-up, login, email confirmation, password reset, OAuth and session problems.
- **ai-visibility**: make a client-rendered app readable by Google, link previews and AI crawlers (prerendering, meta tags, sitemap, robots.txt, JSON-LD), verified with curl.
- **safe-change**: the working discipline for changes: checkpoint, reproduce, smallest diff, verify, commit.

## Install: Claude Code

From your project's root folder (adjust the path to where you unzipped the kit):

```bash
# 1. Project instructions
cp ~/Downloads/production-kit/CLAUDE.md ./CLAUDE.md

# 2. Skills
mkdir -p .claude/skills
cp -R ~/Downloads/production-kit/skills/* .claude/skills/
```

If you already have a `CLAUDE.md`, don't overwrite it: paste the kit's content below yours and remove anything that contradicts your project.

You should end up with `.claude/skills/supabase-rls-audit/SKILL.md` and so on. Claude uses a skill automatically when your request matches its description, or you can call one directly, e.g. `/supabase-rls-audit`. To use the skills in every project, copy them to `~/.claude/skills/` instead.

Commit `CLAUDE.md` and `.claude/skills/` so they stay with the project.

## Install: Cursor

```bash
mkdir -p .cursor/rules
cp ~/Downloads/production-kit/cursor-rules/*.mdc .cursor/rules/
```

- `security.mdc` and `change-discipline.mdc` apply to every request.
- `supabase.mdc` and `deploy.mdc` attach automatically when you work on matching files (SQL, Supabase client, config, env files). Edit the `globs:` line if your folders are named differently.

To use a skill in Cursor, mention it in chat, e.g. "Follow @skills/supabase-rls-audit/SKILL.md for this project" (keep the `skills/` folder in your repo or add it as context).

## Install: Lovable and Bolt

Open `lovable-bolt-instructions.md`, copy everything, and paste it into:
- **Lovable**: your project's settings, under Knowledge (project knowledge / custom instructions).
- **Bolt**: your project's settings, under the project prompt / knowledge section.

Menu names in these tools change often; look for the place where you give the AI standing instructions for the project. It applies to future prompts, not to code already written, so after adding it, ask the tool to review existing code against these rules, one area at a time (e.g. "Check every Supabase table has RLS enabled per the project knowledge; list problems before changing anything").

## Other tools

Codex, Windsurf and other agents that read `AGENTS.md`: copy `CLAUDE.md` to `AGENTS.md` in your repo root.

## Using the checklists

Work through `checklists/launch-checklist.md` before you invite real users, and `checklists/security-checklist.md` before launch and after any big change to your database or auth. Test on your deployed site, not just localhost.

## Using the SQL

Open Supabase Dashboard > SQL Editor, paste one query at a time from `sql/rls-status.sql` and run it. It only reads; it changes nothing. For `sql/example-policies.sql`, copy only the pattern you need, rename the tables and columns to match yours, and run it as a migration. Read the comments first.

## Limits

This kit reduces the most common production failures. It doesn't guarantee your app is secure or bug-free: the AI can still make mistakes, and the checklists only help if you actually run them. For anything handling payments, health or other sensitive data, get a human review.

Questions or problems with the kit: contact via https://anadithakur.in
