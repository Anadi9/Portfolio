import { useState, type ReactNode } from 'react';
import { Link } from 'vite-react-ssg';
import * as Menu from '@radix-ui/react-navigation-menu';
import * as Dialog from '@radix-ui/react-dialog';
import { Bit, PixelIcon } from '@/components/brand/Bit';
import {
  CLIENT_LOGIN_HREF,
  MEET_MENU,
  NAV_POSTS,
  PRICING_HREF,
  RESOURCES_MENU,
  SERVICES_MENU,
  TALK_TO_BIT,
  TOOLS_MENU,
  navDate,
  type NavColumn,
  type NavFeature,
  type NavIcon,
  type NavLink,
  type ResourceKey,
} from '@/data/nav';

/**
 * The header's menus. Desktop: Radix Navigation Menu (hover with a short
 * delay or click to open, arrow keys inside, Esc closes, the right ARIA for
 * site navigation). Services and Free tools are mega panels; Resources is a
 * list with a detail pane; Meet us is a short list. Below 1180px the row hides
 * (`.bq-navlinks` in brand.css) and the ☰ button opens a Radix Dialog that
 * drills down one level with a Back button. Styles: `styles/nav.css`.
 * Menu content: `data/nav.ts`.
 */

const internal = (href: string) => href.startsWith('/') && !href.includes('#');

/** A router link inside the SPA, a plain anchor for hash links (homepage sections). */
function Go({ href, className, children, onClick }: { href: string; className?: string; children: ReactNode; onClick?: () => void }) {
  return internal(href) ? (
    <Link to={href} className={className} onClick={onClick}>
      {children}
    </Link>
  ) : (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

/** Inside a desktop panel: selecting the link closes the menu. */
const MenuLink = ({ href, className, children }: { href: string; className?: string; children: ReactNode }) => (
  <Menu.Link asChild>
    <Go href={href} className={className}>
      {children}
    </Go>
  </Menu.Link>
);

function Glyph({ icon }: { icon: NavIcon }) {
  if (icon === 'lock' || icon === 'spark' || icon === 'shield') return <PixelIcon name={icon} size={24} />;
  const ink = { fill: 'none', stroke: '#121212', strokeWidth: 2.4 } as const;
  const mark = { stroke: '#d42e24', strokeWidth: 2.6 } as const;
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      {icon === 'rocket' && (
        <>
          <path d="M12 2c3 2.2 5 6 5 10l-2 4H9l-2-4c0-4 2-7.8 5-10z" {...ink} strokeLinejoin="round" />
          <circle cx="12" cy="10" r="2.2" fill="#d42e24" />
          <path d="M9 16l-3 3M15 16l3 3M12 17v4" {...mark} />
        </>
      )}
      {icon === 'lens' && (
        <>
          <circle cx="10" cy="10" r="6" {...ink} />
          <path d="M15 15l6 6" {...mark} strokeWidth={3} />
        </>
      )}
      {icon === 'video' && (
        <>
          <rect x="3" y="5" width="18" height="14" {...ink} />
          <path d="M10 9l5 3-5 3z" fill="#d42e24" />
        </>
      )}
      {icon === 'doc' && (
        <>
          <path d="M5 3h10l4 4v14H5z" {...ink} />
          <path d="M12 10v7M9 14l3 3 3-3" fill="none" {...mark} />
        </>
      )}
    </svg>
  );
}

const ItemBody = ({ link }: { link: NavLink }) => (
  <>
    {link.icon && (
      <span className="sn-ico">
        <Glyph icon={link.icon} />
      </span>
    )}
    <span>
      <b>{link.title}</b>
      <span className="sn-desc">{link.desc}</span>
    </span>
  </>
);

function Columns({ columns }: { columns: NavColumn[] }) {
  return (
    <>
      {columns.map((col) => (
        <div key={col.heading}>
          <p className="sn-colh">{col.heading}</p>
          <ul className="sn-links">
            {col.links.map((link) => (
              <li key={link.href}>
                <MenuLink href={link.href} className="sn-item">
                  <ItemBody link={link} />
                </MenuLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

function Feature({ f, onPick }: { f: NavFeature; onPick?: () => void }) {
  const cta = <span className="sn-btn">{f.cta.text} <span aria-hidden>▶</span></span>;
  return (
    <div className={f.dark ? 'sn-feature sn-feature-dark' : 'sn-feature'}>
      {f.dark && (
        <span className="sn-bit">
          <Bit pose="scan" size={44} />
        </span>
      )}
      <span className="sn-eyebrow">{f.eyebrow}</span>
      <span className="sn-feature-title">{f.title}</span>
      <span className="sn-feature-body">{f.body}</span>
      {onPick ? (
        <Go href={f.cta.href} className="sn-cta" onClick={onPick}>
          {cta}
        </Go>
      ) : (
        <MenuLink href={f.cta.href} className="sn-cta">
          {cta}
        </MenuLink>
      )}
    </div>
  );
}

function ResourcesPanel() {
  const [active, setActive] = useState<ResourceKey>('fix');
  const cat = RESOURCES_MENU.find((r) => r.key === active)!;
  const posts = NAV_POSTS[active];
  return (
    <div className="sn-res">
      <div className="sn-res-list">
        <p className="sn-colh">The blog</p>
        {RESOURCES_MENU.map((r) => (
          <button
            key={r.key}
            type="button"
            className="sn-cat"
            data-on={r.key === active ? '' : undefined}
            aria-pressed={r.key === active}
            onPointerEnter={() => setActive(r.key)}
            onFocus={() => setActive(r.key)}
            onClick={() => setActive(r.key)}
          >
            {r.title}
            <small>
              {NAV_POSTS[r.key].count} {r.key === 'drop' ? 'free' : 'posts'} ›
            </small>
          </button>
        ))}
      </div>
      <div className="sn-res-pane" aria-live="polite">
        <p className="sn-res-title">{cat.title}</p>
        <p className="sn-res-blurb">{cat.blurb}</p>
        <ul className="sn-links">
          {posts.latest.map((post) => (
            <li key={post.href}>
              <MenuLink href={post.href} className="sn-post">
                <span className="sn-post-date">{navDate(post.date)}</span>
                {post.title}
              </MenuLink>
            </li>
          ))}
        </ul>
        <MenuLink href={posts.href} className="sn-more">
          {cat.all}
        </MenuLink>
      </div>
    </div>
  );
}

const Chevron = () => (
  <svg className="sn-chev" viewBox="0 0 10 6" width="10" height="6" aria-hidden="true">
    <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

/** The desktop row. Every panel opens in one shared viewport that hangs full-width under the header. */
export function SiteNavDesktop() {
  return (
    <Menu.Root className="sn-root bq-navlinks" delayDuration={120} aria-label="Site">
      <Menu.List className="sn-list">
        <Menu.Item value="services">
          <Menu.Trigger className="sn-trig">
            Services <Chevron />
          </Menu.Trigger>
          <Menu.Content className="sn-panel">
            <div className="sn-grid">
              <Columns columns={SERVICES_MENU.columns} />
              <Feature f={SERVICES_MENU.feature} />
            </div>
            <div className="sn-strip">
              <span>{SERVICES_MENU.strip.text}</span>
              <MenuLink href={SERVICES_MENU.strip.link.href} className="sn-more">
                {SERVICES_MENU.strip.link.text}
              </MenuLink>
            </div>
          </Menu.Content>
        </Menu.Item>
        <Menu.Item value="tools">
          <Menu.Trigger className="sn-trig">
            Free tools <Chevron />
          </Menu.Trigger>
          <Menu.Content className="sn-panel">
            <div className="sn-grid">
              <Columns columns={TOOLS_MENU.columns} />
              <Feature f={TOOLS_MENU.feature} />
            </div>
          </Menu.Content>
        </Menu.Item>
        <Menu.Item value="resources">
          <Menu.Trigger className="sn-trig">
            Resources <Chevron />
          </Menu.Trigger>
          <Menu.Content className="sn-panel">
            <ResourcesPanel />
          </Menu.Content>
        </Menu.Item>
        <Menu.Item>
          <MenuLink href={PRICING_HREF} className="sn-trig">
            Pricing
          </MenuLink>
        </Menu.Item>
        <Menu.Item value="meet">
          <Menu.Trigger className="sn-trig">
            Meet us <Chevron />
          </Menu.Trigger>
          <Menu.Content className="sn-panel sn-panel-sm">
            <ul className="sn-links">
              {MEET_MENU.map((link) => (
                <li key={link.href}>
                  <MenuLink href={link.href} className="sn-item sn-item-plain">
                    <ItemBody link={link} />
                  </MenuLink>
                </li>
              ))}
              <li className="sn-only-mid">
                <MenuLink href={CLIENT_LOGIN_HREF} className="sn-item sn-item-plain">
                  <ItemBody link={{ title: 'Client login', desc: 'Follow your request', href: CLIENT_LOGIN_HREF }} />
                </MenuLink>
              </li>
            </ul>
          </Menu.Content>
        </Menu.Item>
      </Menu.List>
      <div className="sn-viewport-wrap">
        <Menu.Viewport className="sn-viewport" />
      </div>
    </Menu.Root>
  );
}

type Level = 'root' | 'services' | 'tools' | 'resources' | 'meet';

const LEVELS: { key: Exclude<Level, 'root'>; title: string }[] = [
  { key: 'services', title: 'Services' },
  { key: 'tools', title: 'Free tools' },
  { key: 'resources', title: 'Resources' },
  { key: 'meet', title: 'Meet us' },
];

/** Phones and narrow windows: ☰ opens a full-screen panel that drills one level down. */
export function SiteNavMobile({ onTalkToBit }: { onTalkToBit: (e: { preventDefault: () => void }) => void }) {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<Level>('root');
  const close = () => setOpen(false);
  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) setLevel('root');
  };
  const title = LEVELS.find((l) => l.key === level)?.title;

  const rows = (links: NavLink[]) =>
    links.map((link) => (
      <Go key={link.href} href={link.href} className="sn-m-sub" onClick={close}>
        <ItemBody link={link} />
      </Go>
    ));

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger className="sn-burger" aria-label="Open menu">
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <path d="M2 4h16M2 10h16M2 16h16" stroke="currentColor" strokeWidth="3" />
        </svg>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Content className="sn-sheet" aria-describedby={undefined}>
          <div className="sn-sheet-top">
            <Dialog.Title className="sn-sheet-title">{title ?? 'Menu'}</Dialog.Title>
            <Dialog.Close className="sn-burger" aria-label="Close menu">
              <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
                <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="3" />
              </svg>
            </Dialog.Close>
          </div>

          {level === 'root' ? (
            <div className="sn-m-level" key="root">
              <nav aria-label="Site" className="sn-m-nav">
                {LEVELS.slice(0, 3).map((l) => (
                  <button key={l.key} type="button" className="sn-m-row" onClick={() => setLevel(l.key)}>
                    {l.title} <i aria-hidden>›</i>
                  </button>
                ))}
                <Go href={PRICING_HREF} className="sn-m-row" onClick={close}>
                  Pricing
                </Go>
                <button type="button" className="sn-m-row" onClick={() => setLevel('meet')}>
                  Meet us <i aria-hidden>›</i>
                </button>
              </nav>
              <div className="sn-m-foot">
                <Link
                  to={TALK_TO_BIT}
                  className="bq-btn"
                  onClick={(e) => {
                    close();
                    onTalkToBit(e);
                  }}
                >
                  <span aria-hidden>▶</span> Talk to Bit
                </Link>
                <Link to={CLIENT_LOGIN_HREF} className="sn-login" onClick={close}>
                  Client login
                </Link>
              </div>
            </div>
          ) : (
            <div className="sn-m-level sn-m-in" key={level}>
              <button type="button" className="sn-back" onClick={() => setLevel('root')}>
                <span aria-hidden>‹</span> Back
              </button>
              {level === 'services' && (
                <>
                  {SERVICES_MENU.columns.map((col) => (
                    <div key={col.heading}>
                      <p className="sn-colh">{col.heading}</p>
                      {rows(col.links)}
                    </div>
                  ))}
                  <div className="sn-m-feature">
                    <Feature f={SERVICES_MENU.feature} onPick={close} />
                  </div>
                </>
              )}
              {level === 'tools' &&
                TOOLS_MENU.columns.map((col) => (
                  <div key={col.heading}>
                    <p className="sn-colh">{col.heading}</p>
                    {rows(col.links)}
                  </div>
                ))}
              {level === 'resources' && (
                <>
                  <p className="sn-colh">The blog</p>
                  {RESOURCES_MENU.map((r) => (
                    <Go key={r.key} href={NAV_POSTS[r.key].href} className="sn-m-row" onClick={close}>
                      {r.title} <i aria-hidden>{NAV_POSTS[r.key].count} ›</i>
                    </Go>
                  ))}
                </>
              )}
              {level === 'meet' && rows(MEET_MENU)}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
