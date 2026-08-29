import type { CSSProperties, ReactNode } from 'react';
import { c, display, heading, label, mono, px, rule, s } from '@/components/portfolio/tokens';
import CopyBlock from './CopyBlock';
import Figure from './Figure';
import Flow from './Flow';
import PromptLibrary from './PromptLibrary';
import ProseTable from './ProseTable';

/**
 * The reading column. Wide enough for a code block, narrow enough for prose.
 *
 * Notes headings take the `vw: true` branch of the display ramp throughout. The
 * ramp's `cqw` default is tuned against a ~1450px container, and this column
 * caps at 760 — measuring against it would land an H1 at roughly half the size
 * the step is meant to be. There is no container query context here to measure
 * anyway, so the viewport is both the honest and the intended reference.
 */
export const MEASURE = 760;

const body: CSSProperties = {
  font: `400 17px/1.65 ${display}`,
  color: '#1c1c1c',
};

/**
 * The MDX element map.
 *
 * Passed to each compiled body rather than installed through a provider: the
 * three stream layouts are the only consumers, and a prop keeps the styling
 * visible at the call site instead of hidden in context two levels up.
 *
 * Lowercase keys override the elements markdown produces; capitalised ones are
 * components an MDX author calls by name, without an import.
 *
 * Tables and `<pre>` are both components now rather than styled elements.
 * `ProseTable` parses what MDX hands it so a comparison table can be reordered
 * and can present as labelled cards on a phone — a table that scrolls sideways
 * hides the payload of a page like the cheat sheet behind a gesture. `CopyBlock`
 * exists because the workflow skeletons on `/drops/automate` are there to be
 * pasted somewhere else.
 */
export const prose = {
  h2: (p: { children?: ReactNode }) => (
    <h2
      style={{
        ...heading('d5', { vw: true }),
        color: c.ink,
        margin: px(s[11], 0, s[5]),
        textTransform: 'uppercase',
      }}
      {...p}
    />
  ),
  h3: (p: { children?: ReactNode }) => (
    <h3 style={{ ...heading('d6', { vw: true }), color: c.ink, margin: px(s[9], 0, s[4]) }} {...p} />
  ),
  h4: (p: { children?: ReactNode }) => (
    <h4 style={{ ...label(12, 700, 0.12), color: c.markOnPaper, margin: px(s[8], 0, s[3]) }} {...p} />
  ),
  p: (p: { children?: ReactNode }) => <p style={{ ...body, margin: px(0, 0, s[5]) }} {...p} />,
  ul: (p: { children?: ReactNode }) => (
    <ul style={{ ...body, margin: px(0, 0, s[5]), paddingLeft: s[6] }} {...p} />
  ),
  ol: (p: { children?: ReactNode }) => (
    <ol style={{ ...body, margin: px(0, 0, s[5]), paddingLeft: s[6] }} {...p} />
  ),
  li: (p: { children?: ReactNode }) => <li style={{ marginBottom: s[2] }} {...p} />,
  a: (p: { children?: ReactNode; href?: string }) => (
    <a
      style={{ color: c.ink, textDecorationColor: c.markOnPaper, textUnderlineOffset: 3 }}
      {...p}
      {...(p.href?.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
    />
  ),
  strong: (p: { children?: ReactNode }) => <strong style={{ fontWeight: 700 }} {...p} />,
  hr: () => <hr style={{ border: 0, borderTop: `${rule.base}px solid ${c.ink}`, margin: px(s[10], 0) }} />,

  blockquote: (p: { children?: ReactNode }) => (
    <blockquote
      style={{
        margin: px(0, 0, s[5]),
        padding: px(s[4], 0, s[4], s[6]),
        borderLeft: `${rule.edge}px solid ${c.mark}`,
        ...body,
      }}
      {...p}
    />
  ),

  // Inline code and block code arrive through the same element; the block form
  // is the one wrapped in <pre>, which resets the inline chrome below.
  code: (p: { children?: ReactNode }) => (
    <code
      style={{
        font: `500 0.88em/1.5 ${mono}`,
        background: c.accent,
        padding: '2px 5px',
        color: c.ink,
      }}
      {...p}
    />
  ),
  pre: CopyBlock,

  table: ProseTable,

  // Called by name from MDX; see `Flow`'s own note on why it draws rather
  // than lists.
  Figure,
  Flow,
  PromptLibrary,
};
