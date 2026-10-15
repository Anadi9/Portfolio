/**
 * Bit's Quest versions of the Terminal Head UI helpers (same exports, same
 * props), drawn with Bit and the brand palette. Every page except the
 * portfolio imports these instead of `terminal-head/TerminalHeadUI`.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'vite-react-ssg';
import { TerminalHead, type THFace } from './BitHead';
import { Bit } from './Bit';

const v = (name: string, fallback: string) => `var(--pp-${name}, ${fallback})`;
const ink = v('ink', 'var(--bq-ink)');
const paper = v('bg', 'var(--bq-bg)');
const card = v('card', 'var(--bq-panel)');
const red = v('shell', '#d42e24');
const redText = v('red-text', '#d42e24');
const green = v('ok', '#2f7d5b');
const muted = v('dim', 'var(--bq-muted)');
const font = "'Space Grotesk', system-ui, sans-serif";
const pixel = "'Jersey 10', system-ui, sans-serif";
const label = "'Press Start 2P', monospace";

/* Nav logo: mini Bit + wordmark (design: nav). Bit waves on hover/focus. */
export function NavLogo({ href = '/', onClick }: { href?: string; onClick?: () => void }) {
  const [hi, setHi] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const hello = () => { clearTimeout(timer.current); setHi(true); };
  const back = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setHi(false), 600); };
  return (
    <Link to={href} aria-label="anadithakur.in home" onClick={onClick}
      onMouseEnter={hello} onMouseLeave={back} onFocus={hello} onBlur={back}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minHeight: 44, color: ink, textDecoration: 'none' }}>
      <Bit pose={hi ? 'wave' : 'scan'} size={36} />
      <span style={{ fontFamily: pixel, fontWeight: 400, fontSize: 28, lineHeight: 1 }}>anadi.thakur</span>
    </Link>
  );
}

/* Primary button with THINKING state */
export function LoadingButton({ loading, children, loadingText = 'Working…', ...rest }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; loadingText?: string }) {
  return (
    <button {...rest} disabled={loading || rest.disabled} aria-busy={loading} className={`bq-btn ${rest.className ?? ''}`.trim()}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: red, color: '#fff', border: 0,
        font: `400 12px/1.5 ${label}`, textTransform: 'uppercase', padding: loading ? '5px 16px 5px 8px' : '12px 16px',
        cursor: loading ? 'progress' : 'pointer', ...rest.style }}>
      {loading ? (<><TerminalHead face="think" size={28} label="" /><span role="status">{loadingText}</span></>) : children}
    </button>
  );
}

/* Toast: success = FIXED + hop, error = ERROR + shake */
export function Toast({ kind, title, children }: { kind: 'success' | 'error'; title: string; children?: React.ReactNode }) {
  const ok = kind === 'success';
  return (
    <div role={ok ? 'status' : 'alert'}
      style={{ display: 'flex', alignItems: 'center', gap: 10, background: card, border: `2px solid ${ink}`, boxShadow: `4px 4px 0 ${ink}`,
        borderLeft: `6px solid ${ok ? green : red}`, padding: '6px 12px', font: `13px ${font}`, color: ink, maxWidth: 420 }}>
      <TerminalHead face={ok ? 'fixed' : 'error'} motion={ok ? 'hop' : 'idle'} size={32} label="" />
      <span><b>{title}</b> {children}</span>
    </div>
  );
}

/* Form field error line with ERROR face. Use under any existing input. */
export function FieldError({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <div id={id} style={{ display: 'flex', alignItems: 'center', gap: 8, color: redText, font: `13px ${font}` }}>
      <TerminalHead face="error" size={26} label="" /><span>{children}</span>
    </div>
  );
}

/* Form field with ERROR face */
export function Field({ label: text, error, ...input }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const id = input.id || input.name || text.toLowerCase().replace(/\W+/g, '-');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, font: `13px ${font}`, color: ink }}>
      <label htmlFor={id} style={{ fontWeight: 600 }}>{text}</label>
      <input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...input}
        style={{ border: `2px solid ${error ? red : ink}`, padding: '9px 10px', font: `14px 'JetBrains Mono', monospace`, background: card, color: ink }} />
      {error && <FieldError id={`${id}-err`}>{error}</FieldError>}
    </div>
  );
}

/* Empty state: ASLEEP */
export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, border: `2px dashed ${ink}`, font: `14px ${font}`, color: ink }}>
      <TerminalHead face="sleep" size={80} label="Nothing here yet" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <b style={{ fontSize: 16 }}>{title}</b><span style={{ color: muted }}>{body}</span>{action}
      </div>
    </div>
  );
}

/* Service loadouts: the face Bit wears per service. */
export const LOADOUT = {
  app: { prop: 'wrench', face: 'fix', tag: 'FIXER' },
  ai: { prop: 'lens', face: 'scan', tag: 'INSPECTOR' },
  dpdp: { prop: 'shield', face: 'fixed', tag: 'GUARDIAN' },
  audit: { prop: 'clipboard', face: 'found', tag: 'REPORTER' },
} as const;
export type LoadoutKey = keyof typeof LOADOUT;

export function PricingCard({ service, name, price, children }:
  { service: LoadoutKey; name: string; price: string; children?: React.ReactNode }) {
  const l = LOADOUT[service];
  return (
    <div className="th-card" style={{ border: `2px solid ${ink}`, background: card, padding: 16, display: 'flex', flexDirection: 'column', gap: 6, font: `14px ${font}`, color: ink }}>
      <TerminalHead face={l.face} prop={l.prop} size={60} motion="still" label="" />
      <span style={{ fontFamily: label, fontSize: 11, color: redText }}>{l.tag}</span>
      <b style={{ fontSize: 16 }}>{name}</b>
      <span style={{ fontFamily: pixel, fontSize: 29 }}>{price}</span>
      {children}
    </div>
  );
}

/* 404: Retro TV, LOST */
export function NotFound({ homeHref = '/' }: { homeHref?: string }) {
  return (
    <section style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', font: `15px ${font}`, color: ink }}>
      <TerminalHead face="lost" shape="tv" size={120} label="Bit, looking for a missing page" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontFamily: pixel, fontWeight: 400, fontSize: 64, lineHeight: 1, color: red, textShadow: `3px 3px 0 ${ink}` }}>404</span>
        <span style={{ color: muted }}>Bit looked everywhere. This page doesn’t exist, but your app can still be made production-ready.</span>
        <Link to={homeHref} style={{ color: ink, fontWeight: 600 }}>Back to home →</Link>
      </div>
    </section>
  );
}

/* Contact intro: HELLO with speech bubble, peeks in */
export function ContactHello({ message }: { message: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, font: `14px ${font}` }}>
      <TerminalHead face="hello" motion="peek" size={100} label="Bit saying hi" />
      <p style={{ position: 'relative', margin: '0 0 40px', background: ink, color: paper, padding: '12px 14px', maxWidth: 320, lineHeight: 1.45 }}>{message}</p>
    </div>
  );
}

/* Availability badge: PROMPT = open, ASLEEP = booked */
export function StatusBadge({ available }: { available: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `2px solid ${ink}`, padding: '3px 10px 3px 4px', font: `600 12px ${font}`, background: card, color: ink }}>
      <TerminalHead face={available ? 'prompt' : 'sleep'} size={20} motion="still" label="" />
      {available ? 'Taking new projects' : 'Booked — join waitlist'}
    </span>
  );
}

/* Scan progress: SCANNING → FOUND IT → FIXED */
export type ScanStage = 'idle' | 'thinking' | 'scanning' | 'found' | 'done' | 'error';
export function ScanStatus({ stage, findings = 0, text, prop = 'lens', size = 120 }:
  { stage: ScanStage; findings?: number; text?: string; prop?: 'lens' | 'clipboard' | 'shield' | 'none'; size?: number }) {
  const face: THFace = { idle: 'prompt', thinking: 'think', scanning: 'scan', found: 'found', done: 'fixed', error: 'error' }[stage] as THFace;
  const fallback = {
    idle: 'Paste a URL to start', thinking: 'Working…', scanning: 'Scanning…',
    found: `${findings} issue${findings === 1 ? '' : 's'} found so far`, done: 'Report ready', error: 'Something went wrong',
  }[stage];
  return (
    <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 14, font: `15px ${font}`, color: ink }}>
      <TerminalHead face={face} prop={prop} size={size} motion={stage === 'done' ? 'hop' : 'idle'} label="" />
      <b>{text ?? fallback}</b>
    </div>
  );
}

/**
 * Page-state head for status pages (thanks, downloads): the face follows the
 * page's state, and arriving at `fixed` plays the success hop once.
 */
export function StateHead({ face, label: text = '' }: { face: THFace; label?: string }) {
  return <TerminalHead key={face} face={face} size={80} motion={face === 'fixed' ? 'hop' : 'idle'} label={text} />;
}

/** Face for a 0–100 readiness score, on the same 80 / 50 cut-offs the tools colour their scores by. */
export const scoreFace = (score: number): THFace => (score >= 80 ? 'fixed' : score >= 50 ? 'found' : 'error');
