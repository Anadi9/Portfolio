import { describe, expect, it } from 'vitest';
import { posts } from './index';
import { hasCover, pathToStream, streamPath, type FixPost } from '@/data/notes';
import { SYMPTOMS } from '@/lib/rescue/intake';
import { auditHref, symptomIndex } from '@/components/notes/fixLinks';
import { headOf } from '@/components/notes/postSeo';

describe('corpus headings', () => {
  it('has posts to check', () => {
    expect(posts.length).toBeGreaterThan(0);
  });

  it('gives every post a headings array', () => {
    for (const post of posts) {
      expect(Array.isArray(post.headings), `${post.path} has no headings array`).toBe(true);
    }
  });

  it('gives every heading a unique id within its post', () => {
    for (const post of posts) {
      const ids = post.headings.map((h) => h.id);
      expect(new Set(ids).size, `${post.path} has duplicate heading ids`).toBe(ids.length);
    }
  });

  /**
   * `automate` writes its per-workflow subheadings (Trigger, Steps, Setup
   * notes) as h4, so the repeated-heading path the plugin handles is exercised
   * by its own unit test rather than by the corpus. What the corpus proves here
   * is that the five workflow titles come through as the rail's spine, which is
   * the thing the page actually needs.
   */
  it('extracts the five workflow titles on automate', () => {
    const automate = posts.find((p) => p.path === '/drops/automate');
    expect(automate).toBeDefined();

    const workflows = automate!.headings.filter((h) => h.depth === 2 && /^\d+\./.test(h.text));
    expect(workflows).toHaveLength(5);
    expect(new Set(workflows.map((h) => h.id)).size).toBe(5);
  });

  it('only ever emits depth 2 or 3', () => {
    for (const post of posts) {
      for (const heading of post.headings) {
        expect([2, 3]).toContain(heading.depth);
      }
    }
  });
});

describe('fix stream', () => {
  const fixes = posts.filter((p) => p.stream === 'fix') as FixPost[];

  it('publishes the six fixes under /fixes/', () => {
    expect(fixes.map((p) => p.path).sort()).toEqual([
      '/fixes/ai-prompt-breaks-other-things',
      '/fixes/lovable-app-invisible-to-google-and-chatgpt',
      '/fixes/lovable-supabase-rls',
      '/fixes/supabase-auth-signup-login-broken',
      '/fixes/supabase-service-role-key-leaked',
      '/fixes/works-locally-breaks-on-vercel',
    ]);
    for (const post of fixes) {
      expect(post.draft, `${post.path} is a draft`).toBeFalsy();
      expect(streamPath[post.stream]).toBe('fixes');
      expect(pathToStream.fixes).toBe('fix');
    }
  });

  it('gives every fix its one-line repair and a symptom the audit form knows', () => {
    for (const post of fixes) {
      expect(post.fix, `${post.path} has no \`fix\``).toBeTruthy();
      expect(symptomIndex(post.symptom), `${post.path}: symptom "${post.symptom}" is not in SYMPTOMS`).not.toBeNull();
      expect(auditHref(post.symptom)).toMatch(/^\/rescue\/audit\?s=\d+$/);
    }
  });

  it('deep-links each fix to the row it is about', () => {
    const area = (slug: string) => {
      const post = fixes.find((p) => p.slug === slug)!;
      return SYMPTOMS[symptomIndex(post.symptom)!].area;
    };
    expect(area('lovable-supabase-rls')).toBe('Database');
    expect(area('works-locally-breaks-on-vercel')).toBe('Deployment');
    expect(area('lovable-app-invisible-to-google-and-chatgpt')).toBe('Visibility');
    expect(area('supabase-auth-signup-login-broken')).toBe('Auth');
    expect(area('ai-prompt-breaks-other-things')).toBe('Stability');
    expect(area('supabase-service-role-key-leaked')).toBe('Database');
  });

  it('offers /scan on the Supabase database posts only', () => {
    expect(fixes.filter((p) => p.scan).map((p) => p.slug).sort()).toEqual([
      'lovable-supabase-rls',
      'supabase-service-role-key-leaked',
    ]);
  });

  it('gives every fix a cover', () => {
    for (const post of fixes) expect(hasCover(post), post.path).toBe(true);
  });

  it('only relates fixes to posts that exist', () => {
    for (const post of fixes) {
      for (const path of post.related ?? []) {
        expect(posts.some((p) => p.path === path), `${post.path} → ${path}`).toBe(true);
      }
    }
  });
});

/**
 * The head a results page shows. A post only sets `seoTitle` or `description`
 * to fit the snippet, so one that doesn't fit defeats its own reason to exist.
 */
describe('search snippet', () => {
  it('keeps every seoTitle within 65 characters, byline included', () => {
    for (const post of posts) {
      if (post.seoTitle) expect(headOf(post).title.length, post.path).toBeLessThanOrEqual(65);
    }
  });

  it('keeps every description within 160 characters', () => {
    for (const post of posts) {
      if (post.description) expect(post.description.length, post.path).toBeLessThanOrEqual(160);
    }
  });

  it('gives every post whose own title or summary would be truncated a short form', () => {
    for (const post of posts) {
      const { title, description } = headOf(post);
      expect(title.length, `${post.path} needs a seoTitle`).toBeLessThanOrEqual(65);
      expect(description.length, `${post.path} needs a description`).toBeLessThanOrEqual(160);
    }
  });
});

describe('auditHref', () => {
  it('resolves an area to its current index, case-insensitively', () => {
    expect(auditHref('database')).toBe(`/rescue/audit?s=${SYMPTOMS.findIndex((s) => s.area === 'Database')}`);
  });

  it('falls back to the bare form for a missing or unknown area', () => {
    expect(auditHref()).toBe('/rescue/audit');
    expect(auditHref('Nonsense')).toBe('/rescue/audit');
  });
});
