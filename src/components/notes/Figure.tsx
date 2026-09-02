import type { ReactNode } from 'react';
import { c, label, mono, px, rule, s } from '@/components/portfolio/tokens';

/**
 * The container every figure sits in.
 *
 * `bleed` is the whole reason the right gutter exists. A five-node workflow
 * chain does not fit the reading measure, and the alternative, the
 * `overflow-x: auto` box the tables used to use, makes the reader scroll a
 * sub-region sideways to see the payload of the page.
 *
 * The caption is mono and small on purpose: it matches `MetaLine`, so a figure
 * reads as part of the same document rather than as an embed.
 */
const Figure = ({
  caption,
  source,
  bleed,
  children,
}: {
  caption?: string;
  source?: string;
  bleed?: boolean;
  children: ReactNode;
}) => (
  <figure className={bleed ? 'pf-figure pf-bleed' : 'pf-figure'} style={{ margin: px(0, 0, s[8]) }}>
    {children}
    {(caption || source) && (
      <figcaption
        style={{ marginTop: s[4], paddingTop: s[3], borderTop: `${rule.hair}px solid rgba(10,10,10,.2)` }}
      >
        {caption && (
          <p style={{ margin: 0, font: `500 12px/1.5 ${mono}`, letterSpacing: '0.03em', color: c.dim }}>
            <span style={{ ...label(10, 700, 0.14), color: c.markOnPaper, marginRight: s[3] }}>FIG</span>
            {caption}
          </p>
        )}
        {source && <p style={{ margin: px(s[2], 0, 0), font: `500 11px/1.5 ${mono}`, color: c.dim }}>{source}</p>}
      </figcaption>
    )}
  </figure>
);

export default Figure;
