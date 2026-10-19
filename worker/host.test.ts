import { describe, expect, it } from 'vitest';
import { hostAction } from './host';

describe('hostAction', () => {
  it('serves the portfolio as the root of its own host', () => {
    expect(hostAction('portfolio.anadithakur.in', '/')).toEqual({ kind: 'portfolio-root' });
  });

  it('sends /portfolio on the main hosts to the portfolio host, keeping the query', () => {
    expect(hostAction('anadithakur.in', '/portfolio')).toEqual({ kind: 'redirect', location: 'https://portfolio.anadithakur.in/' });
    expect(hostAction('www.anadithakur.in', '/portfolio', '?ref=x')).toEqual({ kind: 'redirect', location: 'https://portfolio.anadithakur.in/?ref=x' });
    expect(hostAction('anadithakur.in', '/portfolio/')).toEqual({ kind: 'redirect', location: 'https://portfolio.anadithakur.in/' });
  });

  it('leaves everything else alone', () => {
    expect(hostAction('anadithakur.in', '/')).toEqual({ kind: 'pass' });
    expect(hostAction('portfolio.anadithakur.in', '/portfolio')).toEqual({ kind: 'pass' });
    expect(hostAction('portfolio.anadithakur.in', '/api/health')).toEqual({ kind: 'pass' });
    expect(hostAction('anadi-site-preview.example.workers.dev', '/portfolio')).toEqual({ kind: 'pass' });
    expect(hostAction('localhost:8787', '/')).toEqual({ kind: 'pass' });
  });

  it('ignores host case and port', () => {
    expect(hostAction('Portfolio.AnadiThakur.in:443', '/')).toEqual({ kind: 'portfolio-root' });
  });
});
