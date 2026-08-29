import { isValidElement, useRef, type ReactNode } from 'react';
import { useCopy } from './useRail';
import { c, label, mono, px, rule, s } from '@/components/portfolio/tokens';

const LANGUAGE = /language-(\w+)/;
const COLLAPSE_ABOVE = 24;

/** The fence's language, off the nested `<code>`'s className. */
const languageOf = (children: ReactNode): string | undefined => {
  if (!isValidElement<{ className?: string }>(children)) return undefined;
  return LANGUAGE.exec(children.props.className ?? '')?.[1]?.toUpperCase();
};

/**
 * Line count, for the collapse decision only.
 *
 * Read off the source string rather than the DOM, because this has to be right
 * during server render and there is no DOM there. It is reliable for MDX code
 * fences, whose children are a single string — no syntax highlighter is
 * installed to break that into spans. The copy path uses `textContent` instead,
 * which is correct whatever the tree turns out to be.
 */
const lineCount = (children: ReactNode): number => {
  if (!isValidElement<{ children?: ReactNode }>(children)) return 0;
  const inner = children.props.children;
  return typeof inner === 'string' ? inner.trimEnd().split('\n').length : 0;
};

/**
 * A code block you can actually take away.
 *
 * The five n8n workflow skeletons on `/drops/automate` are the artifact of that
 * page — the whole point is to paste them into your own instance — and until
 * now the only way to get one was to select it by hand.
 *
 * Collapse is a `<details>`, so the full text stays in the DOM open or closed.
 * A crawler sees every line either way, which is the same rule the rest of this
 * project runs on.
 */
const CopyBlock = ({ children }: { children?: ReactNode }) => {
  const ref = useRef<HTMLPreElement>(null);
  const { copy, copiedKey } = useCopy();
  const language = languageOf(children);
  const long = lineCount(children) > COLLAPSE_ABOVE;

  const block = (
    <pre
      ref={ref}
      className="pf-pre"
      style={{
        margin: 0,
        padding: s[6],
        background: c.plate,
        color: c.bright,
        font: `500 13px/1.6 ${mono}`,
        overflowX: 'auto',
      }}
    >
      {children}
    </pre>
  );

  return (
    <div style={{ margin: px(0, 0, s[6]), border: `${rule.base}px solid ${c.ink}` }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: s[4],
          padding: px(s[2], s[4]),
          background: c.accent,
          borderBottom: `${rule.base}px solid ${c.ink}`,
        }}
      >
        <span style={{ ...label(10, 700, 0.14), color: c.markOnPaper }}>{language ?? 'CODE'}</span>
        <button
          type="button"
          onClick={() => copy(ref.current?.textContent ?? '')}
          className="pf-copy"
          style={{ ...label(10, 700, 0.12) }}
        >
          {copiedKey ? 'COPIED' : 'COPY'}
        </button>
      </div>

      {long ? (
        <details>
          <summary className="pf-copy-more" style={{ ...label(10, 700, 0.12) }}>
            SHOW ALL LINES
          </summary>
          {block}
        </details>
      ) : (
        block
      )}
    </div>
  );
};

export default CopyBlock;
