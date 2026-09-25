import type { ReactNode } from 'react';
import { Link } from 'vite-react-ssg';
import { Seo } from '@/components/Seo';
import KitShell from '@/components/kit/KitShell';
import { body, eyebrow, hint, p } from '@/components/kit/styles';
import { gutter, heading, px, s, sectionY } from '@/components/portfolio/tokens';
import { BUSINESS, LEGAL_PATHS } from '@/data/legal';
import { KIT } from '@/lib/kit/product';

/**
 * `/support`, `/terms`, `/privacy`, `/refunds`: the pages Stripe India asks for
 * before it activates payments. Plain text on the kit's shell, prerendered and
 * indexable, with every business detail read from `data/legal`.
 */

const a = { color: p.ink };
const Mail = () => (
  <a href={`mailto:${BUSINESS.email}`} style={a}>
    {BUSINESS.email}
  </a>
);

function Page({ title, path, description, children }: { title: string; path: string; description: string; children: ReactNode }) {
  return (
    <KitShell>
      <Seo title={`${title} · Anadi Thakur`} description={description} path={path} type="website" />
      <section data-rescue-hpad style={{ padding: px(s[11], gutter, sectionY.bottom) }}>
        <article style={{ display: 'grid', gap: s[7], maxWidth: 720 }}>
          <p style={eyebrow}>LAST UPDATED {BUSINESS.updated.toUpperCase()}</p>
          <h1 style={{ margin: 0, ...heading('d3'), textTransform: 'uppercase' }}>{title}</h1>
          {children}
          <nav aria-label="Policies" style={{ display: 'flex', gap: s[6], flexWrap: 'wrap', ...hint }}>
            <Link to={LEGAL_PATHS.support} style={a}>Support</Link>
            <Link to={LEGAL_PATHS.terms} style={a}>Terms</Link>
            <Link to={LEGAL_PATHS.privacy} style={a}>Privacy</Link>
            <Link to={LEGAL_PATHS.refunds} style={a}>Refunds &amp; cancellation</Link>
          </nav>
        </article>
      </section>
    </KitShell>
  );
}

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section style={{ display: 'grid', gap: s[4] }}>
    <h2 style={{ margin: 0, ...heading('d7') }}>{title}</h2>
    {children}
  </section>
);

const P = ({ children }: { children: ReactNode }) => <p style={body}>{children}</p>;
const List = ({ items }: { items: ReactNode[] }) => (
  <ul style={{ ...body, paddingLeft: '1.2em', display: 'grid', gap: s[2] }}>
    {items.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ul>
);

const ContactBlock = () => (
  <address style={{ ...body, fontStyle: 'normal' }}>
    {BUSINESS.legalName} (sole proprietor)
    <br />
    {BUSINESS.address.map((line) => (
      <span key={line}>
        {line}
        <br />
      </span>
    ))}
    Phone:{' '}
    <a href={BUSINESS.phoneHref} style={a}>
      {BUSINESS.phone}
    </a>
    <br />
    Email: <Mail />
  </address>
);

export function Support() {
  return (
    <Page title="Support & contact" path={LEGAL_PATHS.support} description="How to reach Anadi Thakur about an order, a download, a refund or the rescue service.">
      <P>
        Questions about an order, a download that won’t open, a refund, or the Vibe Code Rescue service: email or call, and you’ll
        get a reply within 2 business days, usually sooner.
      </P>
      <Section title="Contact">
        <ContactBlock />
      </Section>
      <Section title="Before you write">
        <List
          items={[
            <>Lost your download link? It’s in the inbox of the email address you paid with. Check spam, or email me from that address and I’ll resend it.</>,
            <>Want a refund? See the <Link to={LEGAL_PATHS.refunds} style={a}>refund &amp; cancellation policy</Link>, then email me with the address you paid with.</>,
            <>Include your order email and, if you have it, the Stripe receipt number. It makes things faster.</>,
          ]}
        />
      </Section>
    </Page>
  );
}

export function Terms() {
  const days = BUSINESS.refundDays;
  return (
    <Page title="Terms of service" path={LEGAL_PATHS.terms} description="The terms for buying from and using anadithakur.in, including refunds and cancellation.">
      <P>
        These terms cover your use of anadithakur.in and anything you buy on it. The site is run by {BUSINESS.legalName}, a sole
        proprietor based in India (“I”, “me”). By using the site or buying from it, you agree to these terms.
      </P>
      <Section title="What I sell">
        <List
          items={[
            <><strong>{KIT.name}</strong> and its packs: downloadable files (templates, prompts, checklists and code). A one-time purchase, not a subscription.</>,
            <><strong>Vibe Code Rescue</strong>: development and audit services, scoped and priced in writing with you before any work starts. Those written terms apply alongside these.</>,
            <>Free tools (the Supabase check, the teardown) and free articles, provided as they are.</>,
          ]}
        />
      </Section>
      <Section title="Prices and payment">
        <P>
          Prices are shown in US dollars, or in Indian rupees if you are in India, and include any fees. Payments are processed by
          Stripe; I never see or store your card details. You’re charged once, at checkout.
        </P>
      </Section>
      <Section title="Delivery">
        <P>
          Digital products are delivered straight away: a download page opens after payment, and a link to it is emailed to the
          address you paid with. Nothing is shipped physically. If a download doesn’t arrive within an hour, email <Mail />.
        </P>
      </Section>
      <Section title="Licence">
        <P>
          You can use what you buy in any number of projects you own or build for clients, and share it with your own team or
          company. You can’t resell it, give it away, or publish the files outside a project that uses them. The LICENSE file in
          each download has the full terms. I keep the copyright.
        </P>
      </Section>
      <Section title="Refunds">
        <P>
          If a product doesn’t help you, email me within {days} days of buying and I’ll refund you in full. Refunds go back to the
          original payment method. The full policy is on the <Link to={LEGAL_PATHS.refunds} style={a}>refund &amp; cancellation page</Link>.
        </P>
      </Section>
      <Section title="Cancellation">
        <P>
          Products are one-time purchases, so there’s nothing to cancel after you buy; ask for a refund instead. For rescue work,
          you can cancel at any time before work begins for a full refund; after that, you pay for work already done, as set out
          in the written scope.
        </P>
      </Section>
      <Section title="No guarantee">
        <P>
          The products and free tools are provided “as is”. I make them carefully, but I can’t promise they will fit every project
          or catch every problem. To the extent Indian law allows, my total liability to you for any claim is limited to what you
          paid me for the product or service involved.
        </P>
      </Section>
      <Section title="Governing law">
        <P>
          These terms are governed by the laws of India. Any dispute goes to the courts of {BUSINESS.jurisdiction}, India. Please
          email me first: most problems are sorted in a reply.
        </P>
      </Section>
      <Section title="Changes">
        <P>I may update these terms. The date at the top changes when I do, and the terms in force when you bought apply to that purchase.</P>
      </Section>
      <Section title="Contact">
        <ContactBlock />
      </Section>
    </Page>
  );
}

export function Privacy() {
  return (
    <Page title="Privacy policy" path={LEGAL_PATHS.privacy} description="What anadithakur.in collects, why, who processes it, and how to have it deleted.">
      <P>
        This policy explains what personal information anadithakur.in collects, why, and what happens to it. The site is run by{' '}
        {BUSINESS.legalName}, who is responsible for your data. I collect as little as I can.
      </P>
      <Section title="What I collect">
        <List
          items={[
            <><strong>When you buy:</strong> your email address, name and country, and a record of what you bought. Card details go to Stripe and never reach me.</>,
            <><strong>When you ask for an audit or a teardown report:</strong> what you type into the form, usually your name, email, a link to your project and a description of the problem.</>,
            <><strong>When you use the free Supabase check:</strong> the project URL and public key you enter are used for that one check and not stored or logged.</>,
            <><strong>When you browse:</strong> anonymous page views and events (which page, which button, rough country, device type). No cookies, and nothing that identifies you personally.</>,
          ]}
        />
      </Section>
      <Section title="Why">
        <P>
          To take payment, deliver what you bought and let you download it again later; to reply to you; to handle refunds and
          support; to meet tax and accounting obligations; and to see which pages are useful. I don’t sell your data, rent it, or
          use it for advertising.
        </P>
      </Section>
      <Section title="Who processes it">
        <P>Your data is shared only with the services that run the site, each under its own privacy and security terms:</P>
        <List
          items={[
            <><strong>Stripe</strong>: payments and receipts.</>,
            <><strong>Supabase</strong>: the order records behind your downloads page.</>,
            <><strong>Resend</strong>: sending delivery, receipt and reply emails.</>,
            <><strong>Vercel</strong>: hosting and anonymous analytics.</>,
          ]}
        />
        <P>
          Some of these store data outside India. I may also disclose information if the law requires it, for example to a court or
          tax authority.
        </P>
      </Section>
      <Section title="How long I keep it">
        <P>
          Order records are kept for as long as you might need to re-download, and at least as long as Indian tax law requires.
          Audit and report requests are kept while we are in touch and deleted on request.
        </P>
      </Section>
      <Section title="How it’s protected">
        <P>
          Everything travels over HTTPS. Order data sits in a database that only the site’s server can read, behind secret keys that
          never reach the browser. Download links use long random tokens. Access is limited to me.
        </P>
      </Section>
      <Section title="Your rights">
        <P>
          You can ask for a copy of your data, a correction, or its deletion, and withdraw consent at any time. Email <Mail /> from
          the address you used. I’ll reply within 30 days. Grievances under India’s data protection law can be sent to the same
          address, and you can also complain to the Data Protection Board of India.
        </P>
      </Section>
      <Section title="Contact">
        <ContactBlock />
      </Section>
    </Page>
  );
}

export function Refunds() {
  const days = BUSINESS.refundDays;
  return (
    <Page title="Refund & cancellation policy" path={LEGAL_PATHS.refunds} description={`Full refunds within ${days} days on every product, and how to cancel rescue work.`}>
      <Section title="Products">
        <P>
          If {KIT.name}, or any pack of it, doesn’t help you, email <Mail /> within {days} days of buying and I’ll refund you in
          full. You don’t need to give a reason, though I’d like to hear it. After {days} days I’ll still refund you if a download is
          broken or the product isn’t what its page described.
        </P>
      </Section>
      <Section title="How refunds are paid">
        <List
          items={[
            <>I confirm your refund by email within 2 business days of your request.</>,
            <>The money goes back to the card or account you paid with, through Stripe. It usually arrives within 5–10 business days, depending on your bank.</>,
            <>Once refunded, your download link stops working.</>,
          ]}
        />
      </Section>
      <Section title="Cancellation">
        <P>
          Products are one-time purchases with nothing recurring, so there’s nothing to cancel after you pay. If you paid by
          mistake, email me and I’ll refund you.
        </P>
        <P>
          Vibe Code Rescue work can be cancelled at any time before work starts, with a full refund of anything paid. After work
          starts, you pay only for the work done up to cancellation, as set out in the written scope we agreed, and the rest is
          refunded.
        </P>
      </Section>
      <Section title="Contact">
        <ContactBlock />
      </Section>
    </Page>
  );
}
