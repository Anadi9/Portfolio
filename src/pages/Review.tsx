import { useState } from 'react';
import type { ChangeEvent, CSSProperties, FormEvent, ReactNode } from 'react';
import { Link } from 'vite-react-ssg';
import { Seo } from '@/components/Seo';
import { c, display, gutter, heading, label, px, rule, s, sectionY } from '@/components/portfolio/tokens';
import { FIELD_MAX, PHOTO_EDGE, REVIEW_MAX, parseReview, type ReviewField } from '@/lib/review/intake';

/**
 * `/review`: the link Anadi sends to people he has worked with. A star rating
 * and a review are required; name and title identify the reviewer; company and
 * a photo are optional.
 *
 * Validation runs `parseReview` in the browser, the same function the server
 * runs. The photo is shrunk here to `PHOTO_EDGE` px on its long side and sent
 * as a JPEG data URL, so a phone photo never comes near the function body limit.
 *
 * Not indexed: it is a link for people who were sent it, not a page to find.
 */

const TITLE = 'Leave a review · Anadi Thakur';
const DESCRIPTION = 'Worked with Anadi? A few words about it helps more than you think.';
const EMAIL = 'anadithakur99@gmail.com';

const p = {
  bg: c.paper,
  ink: c.ink,
  body: '#4a4a4a',
  dim: c.dim,
  gold: c.markOnPaper,
  error: '#B3261E',
} as const;

const eyebrow: CSSProperties = { ...label(10, 700, 0.16), color: p.gold, margin: 0 };
const body: CSSProperties = { margin: 0, font: `400 17px/1.5 ${display}`, color: p.body, textWrap: 'pretty', maxWidth: '52ch' };
const fieldLabel: CSSProperties = { ...label(11, 700, 0.14), color: p.ink };
const hint: CSSProperties = { margin: 0, font: `400 13px/1.45 ${display}`, color: p.dim };
const input: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: px(s[4], s[5]),
  background: '#fff',
  border: `${rule.base}px solid ${c.ink}`,
  color: p.ink,
  font: `400 16px/1.3 ${display}`,
  borderRadius: 0,
};
const cta: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: s[3],
  minHeight: 56,
  padding: px(0, s[7]),
  background: c.ink,
  color: c.accent,
  border: 0,
  ...label(11, 700, 0.12),
  cursor: 'pointer',
};
const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};

const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Outstanding'];

type Form = { rating: number; review: string; name: string; title: string; company: string; photo: string };
type Status = 'idle' | 'sending' | 'sent' | 'failed';

const Field = ({
  id,
  title,
  optional,
  note,
  error,
  children,
}: {
  id: string;
  title: string;
  optional?: boolean;
  note?: ReactNode;
  error?: string;
  children: ReactNode;
}) => (
  <div style={{ display: 'grid', gap: s[3] }}>
    <label htmlFor={id} style={fieldLabel}>
      {title}
      {optional && <span style={{ color: p.dim }}> · OPTIONAL</span>}
    </label>
    {children}
    {note && <p style={hint}>{note}</p>}
    {error && (
      <p id={`${id}-error`} role="alert" style={{ ...hint, color: p.error }}>
        {error}
      </p>
    )}
  </div>
);

const Star = ({ on }: { on: boolean }) => (
  <svg aria-hidden width={32} height={32} viewBox="0 0 24 24" fill={on ? c.mark : 'none'} stroke={on ? c.markOnPaper : c.ink} strokeWidth={1.6} strokeLinejoin="round">
    <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" />
  </svg>
);

/** Any image the browser can decode, redrawn as a JPEG no larger than `PHOTO_EDGE` on its long side. */
async function shrinkPhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85);
}

export default function Review() {
  const [form, setForm] = useState<Form>({ rating: 0, review: '', name: '', title: '', company: '', photo: '' });
  const [hover, setHover] = useState(0);
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Partial<Record<ReviewField, string>>>({});
  const [status, setStatus] = useState<Status>('idle');

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      set('photo', await shrinkPhoto(file));
    } catch {
      setErrors((er) => ({ ...er, photo: "That photo didn't work. Try a JPG or PNG." }));
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseReview(form);
    if (parsed.ok === false) {
      setErrors({ [parsed.field]: parsed.error });
      document.getElementById(`rv-${parsed.field}`)?.focus();
      return;
    }
    setErrors({});
    setStatus('sending');
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, hp: honeypot }),
      });
      const data = (await res.json().catch(() => ({}))) as { field?: ReviewField; error?: string };
      if (res.status === 400 && data.field) {
        setErrors({ [data.field]: data.error });
        setStatus('idle');
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setStatus('sent');
      window.scrollTo({ top: 0 });
    } catch {
      setStatus('failed');
    }
  };

  const describedBy = (field: ReviewField, extra?: string) =>
    [errors[field] ? `rv-${field}-error` : '', extra ?? ''].filter(Boolean).join(' ') || undefined;

  const shown = hover || form.rating;

  return (
    <div style={{ background: p.bg, color: p.ink, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Seo title={TITLE} description={DESCRIPTION} path="/review" type="website" robots="noindex, nofollow" />

      <header
        data-rescue-header
        style={{ display: 'flex', alignItems: 'center', gap: s[4], padding: px(s[4], gutter), borderBottom: `${rule.edge}px solid rgba(10,10,10,.14)` }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: s[3], textDecoration: 'none' }}>
          <span aria-hidden style={{ width: 22, height: 22, background: c.ink, display: 'block' }} />
          <span style={{ ...label(11, 700, 0.12), color: p.ink }}>ANADI THAKUR</span>
        </Link>
      </header>

      <main style={{ flex: 1 }}>
        <section data-rescue-hpad style={{ padding: px(s[10], gutter, sectionY.bottom) }}>
          <div style={{ maxWidth: 640, display: 'grid', gap: s[8] }}>
            {status === 'sent' ? (
              <div style={{ display: 'grid', gap: s[6] }} aria-live="polite">
                <p style={eyebrow}>REVIEW RECEIVED</p>
                <h1 style={{ margin: 0, ...heading('d3'), textTransform: 'uppercase' }}>
                  Thank you, <span style={{ color: p.gold }}>{form.name.trim().split(' ')[0]}.</span>
                </h1>
                <p style={body}>It means a lot that you took the time. I read every one of these myself.</p>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate style={{ display: 'grid', gap: s[8], minWidth: 0 }}>
                <div style={{ display: 'grid', gap: s[5] }}>
                  <p style={eyebrow}>A REVIEW · TWO MINUTES</p>
                  <h1 style={{ margin: 0, ...heading('d3'), textTransform: 'uppercase', maxWidth: '16ch' }}>
                    How was it <span style={{ color: p.gold }}>working with me?</span>
                  </h1>
                  <p style={body}>
                    Honest is more useful than glowing. What we worked on, what it was like, and what changed because of it.
                  </p>
                </div>

                <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'grid', gap: s[3] }} aria-describedby={describedBy('rating')}>
                  <legend style={{ ...fieldLabel, padding: 0, marginBottom: s[3] }}>YOUR RATING</legend>
                  <div
                    id="rv-rating"
                    tabIndex={-1}
                    onMouseLeave={() => setHover(0)}
                    style={{ display: 'flex', alignItems: 'center', gap: s[1], outline: 'none' }}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <label
                        key={n}
                        data-review-star
                        onMouseEnter={() => setHover(n)}
                        style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 44, height: 44, cursor: 'pointer' }}
                      >
                        <input
                          type="radio"
                          name="rating"
                          value={n}
                          checked={form.rating === n}
                          onChange={() => set('rating', n)}
                          aria-label={`${n} star${n > 1 ? 's' : ''}, ${RATING_WORDS[n]}`}
                          style={visuallyHidden}
                        />
                        <Star on={n <= shown} />
                      </label>
                    ))}
                    <span aria-hidden style={{ ...label(11, 700, 0.14), color: p.dim, marginLeft: s[3] }}>
                      {RATING_WORDS[shown].toUpperCase()}
                    </span>
                  </div>
                  {errors.rating && (
                    <p id="rv-rating-error" role="alert" style={{ ...hint, color: p.error }}>
                      {errors.rating}
                    </p>
                  )}
                </fieldset>

                <Field id="rv-review" title="YOUR REVIEW" error={errors.review}>
                  <textarea
                    id="rv-review"
                    rows={6}
                    maxLength={REVIEW_MAX}
                    placeholder="e.g. What we worked on, what it was like working with me, and what changed because of it."
                    value={form.review}
                    onChange={(e) => set('review', e.target.value)}
                    aria-invalid={!!errors.review || undefined}
                    aria-describedby={describedBy('review')}
                    style={{ ...input, resize: 'vertical', minHeight: 160, font: `400 16px/1.5 ${display}`, borderColor: errors.review ? p.error : c.ink }}
                  />
                </Field>

                <div data-review-pair style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: s[6] }}>
                  <Field id="rv-name" title="YOUR NAME" error={errors.name}>
                    <input
                      id="rv-name"
                      type="text"
                      autoComplete="name"
                      maxLength={FIELD_MAX}
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      aria-invalid={!!errors.name || undefined}
                      aria-describedby={describedBy('name')}
                      style={{ ...input, borderColor: errors.name ? p.error : c.ink }}
                    />
                  </Field>
                  <Field id="rv-title" title="YOUR TITLE" error={errors.title}>
                    <input
                      id="rv-title"
                      type="text"
                      autoComplete="organization-title"
                      maxLength={FIELD_MAX}
                      placeholder="Founder, Engineering Manager…"
                      value={form.title}
                      onChange={(e) => set('title', e.target.value)}
                      aria-invalid={!!errors.title || undefined}
                      aria-describedby={describedBy('title')}
                      style={{ ...input, borderColor: errors.title ? p.error : c.ink }}
                    />
                  </Field>
                </div>

                <Field id="rv-company" title="COMPANY" optional error={errors.company}>
                  <input
                    id="rv-company"
                    type="text"
                    autoComplete="organization"
                    maxLength={FIELD_MAX}
                    value={form.company}
                    onChange={(e) => set('company', e.target.value)}
                    aria-invalid={!!errors.company || undefined}
                    aria-describedby={describedBy('company')}
                    style={{ ...input, borderColor: errors.company ? p.error : c.ink }}
                  />
                </Field>

                <Field id="rv-photo" title="YOUR PHOTO" optional error={errors.photo} note="Shown next to your review. A headshot works best.">
                  <div style={{ display: 'flex', alignItems: 'center', gap: s[5] }}>
                    <span
                      aria-hidden
                      style={{
                        width: 72,
                        height: 72,
                        flexShrink: 0,
                        borderRadius: '50%',
                        border: `${rule.base}px solid ${c.ink}`,
                        background: form.photo ? `center / cover no-repeat url(${form.photo})` : c.accent,
                      }}
                    />
                    <label
                      className="pf-underline"
                      style={{ position: 'relative', ...label(11, 700, 0.14), color: p.ink, cursor: 'pointer' }}
                    >
                      {form.photo ? 'CHANGE PHOTO' : 'UPLOAD PHOTO'}
                      <input
                        id="rv-photo"
                        type="file"
                        accept="image/*"
                        onChange={onPhoto}
                        aria-describedby={describedBy('photo')}
                        style={visuallyHidden}
                      />
                    </label>
                    {form.photo && (
                      <button
                        type="button"
                        onClick={() => set('photo', '')}
                        style={{ background: 'none', border: 0, padding: 0, ...label(11, 700, 0.14), color: p.dim, cursor: 'pointer' }}
                      >
                        REMOVE
                      </button>
                    )}
                  </div>
                </Field>

                {/* Honeypot. Off-screen rather than `display:none`, as on the audit form. */}
                <input
                  type="text"
                  name="company_website"
                  tabIndex={-1}
                  aria-hidden="true"
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }}
                />

                <div style={{ display: 'grid', gap: s[4], justifyItems: 'start' }}>
                  <button type="submit" disabled={status === 'sending'} className="pf-nudge pf-nudge-lg" style={{ ...cta, opacity: status === 'sending' ? 0.6 : 1 }}>
                    {status === 'sending' ? 'Sending…' : 'Send review'}
                    <span aria-hidden>→</span>
                  </button>
                  <p style={hint}>By sending this, you're OK with it appearing on my site with your name, title and photo.</p>
                  {status === 'failed' && (
                    <p role="alert" style={{ ...body, font: `400 15px/1.5 ${display}`, color: p.error }}>
                      That didn&apos;t go through, and it&apos;s my end, not yours. Could you email it to{' '}
                      <a href={`mailto:${EMAIL}?subject=${encodeURIComponent('Review')}&body=${encodeURIComponent(form.review)}`} style={{ color: p.error, fontWeight: 600 }}>
                        {EMAIL}
                      </a>
                      ?
                    </p>
                  )}
                </div>
              </form>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
