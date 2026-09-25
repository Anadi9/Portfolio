import { Link } from 'vite-react-ssg';
import { track } from '@vercel/analytics';
import { c, display, label, px, rule, s } from '@/components/portfolio/tokens';
import type { FixPost } from '@/data/notes';
import { KIT } from '@/lib/kit/product';
import { KitPrice } from '@/lib/kit/use-kit-price';
import { SCAN_PATH, auditHref, symptomLine } from './fixLinks';

/**
 * `fix_cta_click`, fired from the click handler only, so it never runs during
 * prerender; the guard and the catch are there anyway, because a blocked
 * analytics script must never be the reason a link doesn't work.
 */
const clicked = (slug: string, cta: 'audit' | 'scan' | 'kit') => () => {
  if (typeof window === 'undefined') return;
  try {
    track('fix_cta_click', { slug, cta });
  } catch {
    // Analytics is best-effort.
  }
};

/**
 * The close of every fix post.
 *
 * Same dark plate the wisdom stream spends on its tradeoff, so it reads as part
 * of the document rather than an ad dropped into it. It says one thing: if the
 * page you just read describes your app, here is the free audit, with this
 * symptom already ticked. Supabase posts get a second, lighter door to `/scan`,
 * which answers the "is mine exposed?" question in a minute without a form.
 * Below both sits the do-it-yourself option: the Production Kit, as text.
 */
const FixCta = ({ post }: { post: FixPost }) => {
  const line = symptomLine(post.symptom);

  return (
    <aside
      aria-label="Free audit"
      style={{
        marginTop: s[12],
        padding: s[8],
        background: c.plate,
        border: `${rule.base}px solid ${c.ink}`,
      }}
    >
      <p style={{ ...label(10, 700, 0.16), color: c.mark, margin: px(0, 0, s[4]) }}>FREE AUDIT</p>
      <p style={{ margin: px(0, 0, s[4]), font: `700 24px/1.25 ${display}`, letterSpacing: '-0.02em', color: c.bright }}>
        {line ? `“${line}” Sound like your app?` : 'Sound like your app?'}
      </p>
      <p style={{ margin: px(0, 0, s[7]), font: `400 17px/1.6 ${display}`, color: c.dimOnInk }}>
        Send me the link. I&rsquo;ll look at the actual app, not a checklist, and send back a plain-English report of
        what&rsquo;s broken and what it costs to fix. Free, whether or not you hire me.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: s[4], alignItems: 'center' }}>
        <Link
          to={auditHref(post.symptom)}
          onClick={clicked(post.slug, 'audit')}
          className="pf-nudge"
          style={{
            display: 'inline-block',
            padding: px(s[4], s[6]),
            background: c.accent,
            color: c.ink,
            border: `${rule.base}px solid ${c.accent}`,
            textDecoration: 'none',
            ...label(12, 700, 0.12),
          }}
        >
          GET THE FREE AUDIT →
        </Link>

        {post.scan && (
          <a
            href={SCAN_PATH}
            onClick={clicked(post.slug, 'scan')}
            style={{
              display: 'inline-block',
              padding: px(s[4], s[6]),
              color: c.accent,
              border: `${rule.hair}px solid ${c.dimOnInk}`,
              textDecoration: 'none',
              ...label(12, 700, 0.12),
            }}
          >
            RUN THE FREE SUPABASE CHECK
          </a>
        )}
      </div>

      <p style={{ margin: px(s[6], 0, 0), font: `400 15px/1.6 ${display}`, color: c.dimOnInk }}>
        Rather fix it yourself?{' '}
        <Link to={KIT.path} onClick={clicked(post.slug, 'kit')} style={{ color: c.bright, fontWeight: 600 }}>
          The <KitPrice /> Production Kit
        </Link>{' '}
        has the rules and checks I use on every rescue.
      </p>
    </aside>
  );
};

export default FixCta;
