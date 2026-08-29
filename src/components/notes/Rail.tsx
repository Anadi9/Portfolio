import type { ReactNode } from 'react';
import { c, label, mono, px, rule, s } from '@/components/portfolio/tokens';
import type { Heading } from '@/data/notes';
import { useActiveHeading, useDisclosureOpen, useReadProgress } from './useRail';

/**
 * The left gutter on a post.
 *
 * Deliberately one rail and not two. `NotesShell` already argues that a column
 * of chrome before the first sentence is an interruption; two of them box the
 * measure in on both sides and turn a personal site into documentation
 * software. The right gutter stays empty on purpose — it is bleed room for
 * figures, not a second slab.
 *
 * One DOM tree, presented two ways. Below 1200px the grid gives it no track, so
 * it becomes a CONTENTS disclosure under the sticky header; above, CSS hides
 * the summary and it is a sticky aside. Rendering two trees instead would put
 * every heading anchor in the page twice and hand a crawler two of everything.
 *
 * Everything here renders server-side. The scroll-spy and the progress rule are
 * added on hydration; without JavaScript this is still a complete, working list
 * of anchors into the document.
 */
const Rail = ({
  stamp,
  headings,
  children,
}: {
  stamp: string;
  headings: Heading[];
  children?: ReactNode;
}) => {
  const active = useActiveHeading(headings.map((h) => h.id));
  const progress = useReadProgress();
  const open = useDisclosureOpen();

  return (
    <details className="pf-rail" open={open}>
      <summary className="pf-rail-summary">CONTENTS — {stamp}</summary>

      <div className="pf-rail-body">
        <p className="pf-rail-stamp" style={{ ...label(10, 700, 0.14), color: c.markOnPaper, margin: px(0, 0, s[5]) }}>
          {stamp}
        </p>

        {headings.length > 0 && (
          <>
            <div className="pf-rail-progress" aria-hidden="true">
              <span style={{ transform: `scaleX(${progress})` }} />
            </div>

            <nav aria-label="On this page" style={{ margin: px(s[5], 0, s[7]) }}>
              <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {headings.map((heading) => (
                  <li key={heading.id} style={{ paddingLeft: heading.depth === 3 ? s[4] : 0 }}>
                    <a
                      href={`#${heading.id}`}
                      className="pf-rail-link"
                      aria-current={active === heading.id ? 'true' : undefined}
                      style={{
                        display: 'block',
                        padding: px(s[2], 0),
                        font: `500 ${heading.depth === 3 ? 11 : 12}px/1.35 ${mono}`,
                        letterSpacing: '0.02em',
                        textDecoration: 'none',
                      }}
                    >
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </>
        )}

        {children && (
          <div style={{ paddingTop: s[6], borderTop: `${rule.hair}px solid rgba(10,10,10,.2)` }}>{children}</div>
        )}
      </div>
    </details>
  );
};

export default Rail;
