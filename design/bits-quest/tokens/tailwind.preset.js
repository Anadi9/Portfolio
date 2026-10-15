// Tailwind preset — use with tokens.css loaded globally.  module.exports = { presets: [require('./tailwind.preset')] }
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: 'var(--bq-brand)', text: 'var(--bq-brand-text)', soft: 'var(--bq-brand-soft)' },
        secondary: 'var(--bq-secondary)',
        page: 'var(--bq-bg)', grid: 'var(--bq-grid)', panel: 'var(--bq-panel)',
        ink: 'var(--bq-ink)', muted: 'var(--bq-muted)',
        'dark-panel': { DEFAULT: 'var(--bq-dark-panel)', text: 'var(--bq-dark-panel-text)', line: 'var(--bq-dark-line)' },
      },
      fontFamily: { display: ['"Jersey 10"', 'system-ui', 'sans-serif'], body: ['"Space Grotesk"', 'system-ui', 'sans-serif'], label: ['"Press Start 2P"', 'ui-monospace', 'monospace'] },
      fontSize: { h1: 'clamp(40px,5.2vw,74px)', h2: 'clamp(34px,4vw,52px)', label: '11px' },
      borderRadius: { none: '0' },
      borderWidth: { 3: '3px' },
      boxShadow: { hard: '6px 6px 0 var(--bq-ink)', 'hard-sm': '4px 4px 0 var(--bq-ink)', 'hard-lg': '8px 8px 0 var(--bq-ink)', 'hard-brand': '6px 6px 0 var(--bq-brand)' },
      maxWidth: { page: '1240px' },
    },
  },
};
