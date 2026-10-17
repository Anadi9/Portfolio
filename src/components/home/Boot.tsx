import { useEffect } from 'react';
import { Head } from 'vite-react-ssg';

/**
 * The homepage's boot screen from the Bit's Quest design: a dark screen of
 * cells that dissolves while three terminal lines type in, gone after 1.7 s.
 * It is decorative: aria-hidden, pointer-events none (the page underneath is
 * usable from the first frame), shown once per browser session, and never
 * under reduced motion. The inline head script hides it before first paint on
 * later visits in the same session.
 */

export const BOOT_FLAG = 'bq:booted';
const CELLS = Array.from({ length: 96 }, (_, i) => `${(1.1 + (((i * 37) % 23) / 23) * 0.5).toFixed(2)}s`);
const GUARD = `try{if(sessionStorage.getItem('${BOOT_FLAG}'))document.documentElement.classList.add('bq-booted');else sessionStorage.setItem('${BOOT_FLAG}','1')}catch(e){}`;

export function Boot() {
  useEffect(() => {
    // Client-side navigation back to the homepage must not replay it.
    const t = setTimeout(() => document.documentElement.classList.add('bq-booted'), 1800);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      <Head>
        <script>{GUARD}</script>
      </Head>
      <div className="hq-boot" aria-hidden="true">
        <div className="hq-boot-cells">
          {CELLS.map((d, i) => (
            <span key={i} style={{ animationDelay: d }} />
          ))}
        </div>
        <div className="hq-boot-lines">
          <span style={{ animationDelay: '.1s', color: '#ffd60a' }}>BIT · ANADI’S AI ASSISTANT</span>
          <span style={{ animationDelay: '.3s' }}>LOADING SERVICES .............. 3</span>
          <span style={{ animationDelay: '.5s' }}>LOADING FREE TOOLS ........... OK</span>
          <span style={{ animationDelay: '.7s', color: '#ffd60a' }}>
            READY WHEN YOU ARE<span className="hq-boot-cur">_</span>
          </span>
        </div>
      </div>
      <div className="hq-scanl" aria-hidden="true" />
    </>
  );
}
