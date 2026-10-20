import type { ReactNode } from 'react';
import { Link } from 'vite-react-ssg';
import { Seo } from '@/components/Seo';
import KitShell from '@/components/kit/KitShell';
import { body, hint, p } from '@/components/kit/styles';
import { gutter, heading, px, s, sectionY } from '@/components/brand/tokens';
import { BUSINESS, LEGAL_PATHS } from '@/data/legal';
import { KIT } from '@/lib/kit/product';

/**
 * `/support`, `/terms`, `/privacy`, `/refunds`: the site's policy pages. Plain text on the kit's shell, prerendered and
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
          <h1 style={{ margin: 0, ...heading('d3'), textTransform: 'uppercase' }}>{title}</h1>
          <p style={hint}>Last updated {BUSINESS.updated}</p>
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
        Questions about an order, a download that won’t open, a refund, or the Production Readiness service: email or call, and you’ll
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
            <>Include your order email and, if you have it, the receipt or invoice number. It makes things faster.</>,
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
            <><strong>Production Readiness</strong>: development and audit services, scoped and priced in writing with you before any work starts. Those written terms apply alongside these.</>,
            <>Free tools (the Supabase check, the teardown) and free articles, provided as they are.</>,
          ]}
        />
      </Section>
      <Section title="Prices and payment">
        <P>
          Prices are shown in US dollars, or in Indian rupees if you are in India, and include any fees. Payments are made through
          the payment provider named on your invoice; I never see or store your card details.
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
            <><strong>When you buy:</strong> your email address, name and country, and a record of what you bought. Card details go to the payment provider and never reach me.</>,
            <><strong>When you ask for an audit, a first-bug review or a teardown report:</strong> what you type into the form, usually your name, email, a link to your project, its tech stack and a description of the problem. Optionally a WhatsApp number and a budget.</>,
            <><strong>When you send a request through Bit:</strong> Bit, the assistant on the site, runs its scripted questions in your browser and sends nothing until you submit. If you do, the answers and your contact details are saved as a ticket (a number like A-1001) so I can track your request.</>,
            <><strong>When you ask Bit a typed question:</strong> the question is sent to an AI service to write the answer (see below), with the buttons you tapped in the chat so far. Your name, email and app link are not sent with it, and the conversation is not stored beyond a ticket you choose to create.</>,
            <><strong>When you leave a review:</strong> your name, role, company, rating, review and an optional photo. Nothing is shown publicly until I approve it.</>,
            <><strong>When you use the free Supabase check:</strong> the project URL and public key you enter are used for that one check and not stored or logged.</>,
            <><strong>When you browse:</strong> anonymous page views (which page, rough country, device type), button events the site counts itself (which button, which page, rough country; your IP address is not stored), and technical error reports from your browser (the error message, file, line and page path, with nothing that identifies you). No cookies, except one if you sign in to see your requests (below).</>,
          ]}
        />
      </Section>
      <Section title="Why">
        <P>
          To take payment, deliver what you bought and let you download it again later; to answer and carry out the request you
          made; to reply to you and send updates on your ticket; to handle refunds and support; to meet tax and accounting
          obligations; to keep the site working; and to see which pages are useful. I don’t sell your data, rent it, or use it for
          advertising.
        </P>
      </Section>
      <Section title="Bit and AI answers">
        <P>
          Bit has two parts. The scripted flows (the questions, the quote builder, the tour) run in your browser. When you type a
          free-text question, that question is sent to an AI service so it can write a reply, together with where you are in the chat
          and the buttons you tapped (for example “Replit” or “Launching soon”). Email addresses and phone numbers typed into the
          question are masked first. The services are the Vercel AI Gateway, with Groq as a fallback, and requests are only routed to
          providers that have agreed not to train on them. I send no personal data to them beyond what you type into the question, so
          please don’t type secrets or personal details there. AI answers are labelled “AI answer” and are not stored; the site logs
          only which part of the chat the answer led to and how long it took, never the question. If you ask me to take a request
          further, only the ticket you submit is kept.
        </P>
        <P>
          When you submit a request, the site also looks at your app from the outside once, the way a visitor or a search engine
          would: it fetches the public homepage and a few standard files (robots.txt, sitemap, llms.txt) and checks its security
          headers. The result, your answers, the app link, the tech stack and the budget band you picked are then sent to the same
          AI services to draft a short internal brief for me, so I can reply faster. Your name, email, phone number and company are
          never sent, and nothing goes to a provider that trains on it. The brief and a draft reply are stored with your ticket;
          I read and edit every reply before it reaches you, and nothing about price, scope or findings is sent automatically.
        </P>
      </Section>
      <Section title="Tickets and alerts">
        <P>
          Requests are saved as tickets in my database (Supabase) with your contact details, so I can track the work and email you
          about it. When a new ticket arrives I get an alert by email and on my own WhatsApp (sent through Meta’s WhatsApp Cloud
          API to my own number; the alert contains only the ticket number, the type of request and your app’s domain, or your name if you didn’t give an app link). If you tick the WhatsApp box when you submit, I may
          message you by hand from my own WhatsApp about that request, and you can tell me to stop at any time. The site does not
          send WhatsApp messages to you automatically. My replies are otherwise emails, and anything about price, scope or
          findings is written and sent by me.
        </P>
        <P>
          You can follow your own requests at /portal. You sign in with a link I email to the address you used; it works once and
          expires after 15 minutes. While you are signed in, the site keeps one strictly necessary cookie that says which client you
          are, for up to 7 days or until you sign out. The portal shows only your own tickets: where each one is, what has happened
          and the messages I have sent you. My internal notes and drafts are not shown.
        </P>
      </Section>
      <Section title="Who processes it">
        <P>Your data is shared only with the services that run the site, each under its own privacy and security terms:</P>
        <List
          items={[
            <><strong>Supabase</strong>: the order records behind your downloads page, tickets, and reviews.</>,
            <><strong>Resend</strong>: sending delivery, receipt, report and reply emails.</>,
            <><strong>Cloudflare</strong>: hosting, content delivery, anonymous page-view analytics and logs.</>,
            <><strong>Vercel</strong>: the AI Gateway that sends Bit’s typed questions and the internal request brief to the AI model.</>,
            <><strong>Groq</strong>: AI fallback for Bit’s typed questions and the internal request brief (no name, email, phone or company).</>,
            <><strong>Meta (WhatsApp Cloud API)</strong>: alerts to my own number about new tickets. Nothing is sent to you through it.</>,
          ]}
        />
        <P>
          Some of these store data outside India. I may also disclose information if the law requires it, for example to a court or
          tax authority.
        </P>
      </Section>
      <Section title="How long I keep it">
        <P>
          Leads and tickets are kept for 24 months after the last activity on them, then deleted. Chat questions used to get an AI
          answer are not stored beyond a ticket. Order records are kept for as long as you might need to re-download, and at least
          as long as Indian tax law requires. Reviews stay until you ask me to remove them. You can ask me to delete your data
          sooner at any time (see Your rights).
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
          the address you used. Replying “delete” to any email from me works too. I’ll act on it within 30 days, apart from order records I must keep for tax. Grievances under India’s data protection law can be sent to the same
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
            <>The money goes back to the card or account you paid with. It usually arrives within 5–10 business days, depending on your bank.</>,
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
          Production Readiness work can be cancelled at any time before work starts, with a full refund of anything paid. After work
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
