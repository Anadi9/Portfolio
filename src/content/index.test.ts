import { describe, expect, it } from 'vitest';
import { posts } from './index';

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
