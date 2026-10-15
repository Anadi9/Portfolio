import { useEffect, useState } from 'react';

/**
 * Light/dark switch for pages built on the brand CSS variables (the homepage
 * and the service pages built from `ServicePage`). It themes only the
 * nearest `[data-themeable]` page root, never `<html>`, so a dark choice can't
 * leak onto older pages whose colours are still set in code. Light is the
 * default; the choice is remembered per viewer when storage is available.
 */
const KEY = 'bq-theme';

const root = () => document.querySelector<HTMLElement>('.bq-page[data-themeable]');

function apply(dark: boolean) {
  const el = root();
  if (!el) return;
  if (dark) el.setAttribute('data-theme', 'dark');
  else el.removeAttribute('data-theme');
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(KEY);
    } catch {
      /* storage blocked: stay light */
    }
    const isDark = saved === 'dark';
    setDark(isDark);
    apply(isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    apply(next);
    try {
      window.localStorage.setItem(KEY, next ? 'dark' : 'light');
    } catch {
      /* not remembered, still applied */
    }
  };

  return (
    <button type="button" className="bq-theme" onClick={toggle} aria-pressed={dark} aria-label="Dark mode" title={dark ? 'Switch to light' : 'Switch to dark'}>
      <span aria-hidden>{dark ? '☀' : '☾'}</span>
    </button>
  );
}
