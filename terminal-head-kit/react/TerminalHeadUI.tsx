/**
 * Terminal Head — ready-made website components.
 * Each one is a small, unstyled-by-framework React component using inline styles,
 * so it works with or without Tailwind. Restyle freely; keep the face/motion mapping.
 */
import React, { useState } from 'react';
import { TerminalHead, THFace } from './TerminalHead';

const ink = '#121212', paper = '#f2f0ea', red = '#d42e24', green = '#2f7d5b', muted = '#555550';
const font = "'Instrument Sans', system-ui, sans-serif";
const pixel = "'Pixelify Sans', 'Silkscreen', monospace";

/* Nav logo: PROMPT, flips to HELLO on hover */
export function NavLogo({ href = '/' }: { href?: string }) {
  const [face, setFace] = useState<THFace>('prompt');
  return (
    <a href={href} aria-label="anadithakur.in home"
      onMouseEnter={() => setFace('hello')}
      onMouseLeave={() => setTimeout(() => setFace('prompt'), 600)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: ink, textDecoration: 'none' }}>
      <TerminalHead face={face} size={40} label="" />
      <span style={{ fontFamily: pixel, fontWeight: 700, fontSize: 20 }}>anadithakur<span style={{ color: red }}>_</span></span>
    </a>
  );
}

/* Primary button with THINKING state */
export function LoadingButton({ loading, children, loadingText = 'Working…', ...rest }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; loadingText?: string }) {
  return (
    <button {...rest} disabled={loading || rest.disabled} aria-busy={loading}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: ink, color: paper, border: 0,
        font: `600 14px ${font}`, padding: loading ? '5px 16px 5px 8px' : '10px 16px', boxShadow: `4px 4px 0 ${red}`,
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
      style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `2px solid ${ink}`,
        borderLeft: `6px solid ${ok ? green : red}`, padding: '6px 12px', font: `13px ${font}`, color: ink, maxWidth: 420 }}>
      <TerminalHead face={ok ? 'fixed' : 'error'} motion={ok ? 'hop' : 'idle'} size={32} label="" />
      <span><b>{title}</b> {children}</span>
    </div>
  );
}

/* Form field with ERROR face */
export function Field({ label, error, ...input }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const id = input.id || input.name || label.toLowerCase().replace(/\W+/g, '-');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, font: `13px ${font}`, color: ink }}>
      <label htmlFor={id} style={{ fontWeight: 600 }}>{label}</label>
      <input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...input}
        style={{ border: `2px solid ${error ? red : ink}`, padding: '9px 10px', font: `14px 'JetBrains Mono', monospace`, background: '#fff' }} />
      {error && (
        <div id={`${id}-err`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b02a20' }}>
          <TerminalHead face="error" size={26} label="" /><span>{error}</span>
        </div>
      )}
    </div>
  );
}

/* Empty state: ASLEEP */
export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, border: `2px dashed ${ink}`, font: `14px ${font}`, color: ink }}>
      <TerminalHead face="sleep" size={84} label="Nothing here yet" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <b style={{ fontSize: 16 }}>{title}</b><span style={{ color: muted }}>{body}</span>{action}
      </div>
    </div>
  );
}

/* Pricing card with service loadout */
const LOADOUT = {
  rescue: { prop: 'wrench', face: 'fix', tag: 'FIXER' },
  care: { prop: 'shield', face: 'fixed', tag: 'GUARDIAN' },
  audit: { prop: 'clipboard', face: 'found', tag: 'REPORTER' },
  scan: { prop: 'lens', face: 'scan', tag: 'INSPECTOR' },
} as const;
export function PricingCard({ service, name, price, children }:
  { service: keyof typeof LOADOUT; name: string; price: string; children?: React.ReactNode }) {
  const l = LOADOUT[service];
  return (
    <div style={{ border: `2px solid ${ink}`, background: '#fff', padding: 16, display: 'flex', flexDirection: 'column', gap: 6, font: `14px ${font}`, color: ink }}>
      <TerminalHead face={l.face} prop={l.prop} size={60} motion="still" label="" />
      <span style={{ fontFamily: pixel, fontSize: 11, color: red }}>{l.tag}</span>
      <b style={{ fontSize: 16 }}>{name}</b>
      <span style={{ fontFamily: pixel, fontSize: 24 }}>{price}</span>
      {children}
    </div>
  );
}

/* 404: Retro TV, LOST */
export function NotFound({ homeHref = '/' }: { homeHref?: string }) {
  return (
    <section style={{ display: 'flex', alignItems: 'center', gap: 20, font: `15px ${font}`, color: ink }}>
      <TerminalHead face="lost" shape="tv" size={120} label="Terminal Head looking lost" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontFamily: pixel, fontWeight: 700, fontSize: 48, lineHeight: 1 }}>404</span>
        <span style={{ color: muted }}>This page wandered off. Even I can’t debug a URL that never existed.</span>
        <a href={homeHref} style={{ color: ink, fontWeight: 600 }}>Back to home →</a>
      </div>
    </section>
  );
}

/* Contact intro: HELLO with speech bubble, peeks in */
export function ContactHello({ message }: { message: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, font: `14px ${font}` }}>
      <TerminalHead face="hello" motion="peek" size={100} label="Terminal Head saying hi" />
      <p style={{ position: 'relative', margin: '0 0 40px', background: ink, color: paper, padding: '12px 14px', maxWidth: 320, lineHeight: 1.45 }}>{message}</p>
    </div>
  );
}

/* Footer sign-off: LOVE in Night Shift */
export function FooterSignoff({ clients, email }: { clients: string[]; email: string }) {
  return (
    <footer data-th-mode="night" style={{ background: ink, color: paper, padding: '24px 28px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', font: `13px ${font}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <TerminalHead face="love" size={72} label="" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontFamily: pixel, fontWeight: 700, fontSize: 22 }}>Built &amp; looked after by Anadi.</span>
          <span style={{ opacity: 0.7 }}>{clients.join(' · ')}</span>
        </div>
      </div>
      <a href={`mailto:${email}`} style={{ color: paper }}>{email}</a>
    </footer>
  );
}

/* Availability badge: PROMPT = open, ASLEEP = booked */
export function StatusBadge({ available }: { available: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `2px solid ${ink}`, padding: '3px 10px 3px 4px', font: `600 12px ${font}`, background: '#fff' }}>
      <TerminalHead face={available ? 'prompt' : 'sleep'} size={20} label="" />
      {available ? 'Taking new projects' : 'Booked — join waitlist'}
    </span>
  );
}

/* Scan progress: SCANNING → FOUND IT → FIXED */
export function ScanStatus({ stage, findings = 0 }: { stage: 'idle' | 'scanning' | 'found' | 'done'; findings?: number }) {
  const face: THFace = stage === 'scanning' ? 'scan' : stage === 'found' ? 'found' : stage === 'done' ? 'fixed' : 'prompt';
  const text = { idle: 'Paste a URL to start', scanning: 'Scanning your app…', found: `${findings} issue${findings === 1 ? '' : 's'} found so far`, done: 'Report ready' }[stage];
  return (
    <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 14, font: `15px ${font}`, color: ink }}>
      <TerminalHead face={face} prop="lens" size={120} motion={stage === 'done' ? 'hop' : 'idle'} label="" />
      <b>{text}</b>
    </div>
  );
}
