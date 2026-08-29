import { c, display, label, mono, px, s } from '@/components/portfolio/tokens';
import Figure from './Figure';

export type FlowNode = { name: string; kind: 'trigger' | 'step' | 'action'; config?: string };

/**
 * `wrong` marks a chain the post is arguing against.
 *
 * Grey, dashed connectors rather than the gold ones — the palette has no red
 * and does not want one. A reader scanning two diagrams should be able to tell
 * which is the cautionary tale before reading a word of either.
 */
export type FlowTone = 'default' | 'wrong';

const KIND_LABEL: Record<FlowNode['kind'], string> = {
  trigger: 'TRIGGER',
  step: 'STEP',
  action: 'ACTION',
};

/**
 * A workflow, drawn.
 *
 * This site is about automation and until now every workflow on it was a
 * numbered list of prose. The shape of a chain — how many hops before it writes
 * anything, where the filter sits — is exactly what a list is worst at
 * carrying.
 *
 * Static on purpose. The config text is always visible, so a tap-to-reveal
 * interaction would have had nothing to reveal; nodes take hover and focus
 * emphasis in CSS and the component ships no JavaScript at all. Connectors are
 * pseudo-elements rather than SVG so they reflow when the row wraps to a column
 * on a phone, with no viewBox to keep in sync with a layout that changes
 * direction at a breakpoint.
 */
const Flow = ({
  caption,
  nodes,
  tone = 'default',
}: {
  caption?: string;
  nodes: FlowNode[];
  tone?: FlowTone;
}) => (
  <Figure caption={caption} bleed>
    <ol className={tone === 'wrong' ? 'pf-flow pf-flow--wrong' : 'pf-flow'}>
      {nodes.map((node) => (
        <li key={node.name} className="pf-flow-node">
          <p style={{ ...label(9, 700, 0.14), color: c.markOnPaper, margin: px(0, 0, s[2]) }}>
            {KIND_LABEL[node.kind]}
          </p>
          <p style={{ margin: 0, font: `700 15px/1.3 ${display}`, color: c.ink }}>{node.name}</p>
          {node.config && (
            <p style={{ margin: px(s[3], 0, 0), font: `500 11px/1.5 ${mono}`, color: c.dim }}>{node.config}</p>
          )}
        </li>
      ))}
    </ol>
  </Figure>
);

export default Flow;
