import { BYLINE, ORIGIN, PORTFOLIO_ORIGIN } from '@/components/Seo';
import { hasCover, ogImageFor, streamPath, type Post, type Stream } from '@/data/notes';
import { BUSINESS_REF, PERSON_ID } from '@/lib/schema';
import { FAQ } from '@/data/faq.generated';

export { PERSON_ID };


const crumbLabel: Record<Stream, string> = {
  drop: 'Resource drops',
  wisdom: 'Builder wisdom',
  dispatch: 'Dispatch',
  fix: 'Fixes',
};

/** What goes in `<head>`: the short search forms where a post sets them, the page's own otherwise. */
export const headOf = (post: Post) => ({
  title: `${post.seoTitle ?? post.title} · ${BYLINE}`,
  description: post.description ?? post.summary,
});

/**
 * The post's JSON-LD: the article plus its breadcrumb trail, as one graph.
 *
 * `image` is what makes an article eligible for a rich result at all, and the
 * per-post OG card is already the right shape for it. `headline` stays the
 * full title: it is what the page says, and it is not shown in the snippet.
 */
export const articleJsonLd = (post: Post, type: 'Article' | 'TechArticle' | 'NewsArticle') => {
  const url = `${ORIGIN}${post.path}`;
  // Posts written as questions and answers also carry FAQPage, built from their own `## …?` headings.
  const faq = FAQ[post.path];
  const author = { '@type': 'Person', '@id': PERSON_ID, name: 'Anadi Thakur', url: PORTFOLIO_ORIGIN };
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': type,
        '@id': `${url}#article`,
        headline: post.title,
        description: post.description ?? post.summary,
        url,
        mainEntityOfPage: url,
        inLanguage: 'en',
        datePublished: post.date,
        dateModified: post.lastVerified ?? post.date,
        author,
        publisher: BUSINESS_REF,
        image: `${ORIGIN}${hasCover(post) ? ogImageFor(post.path) : '/og.png'}`,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { name: 'Home', item: `${ORIGIN}/` },
          { name: 'Notes', item: `${ORIGIN}/notes` },
          { name: crumbLabel[post.stream], item: `${ORIGIN}/${streamPath[post.stream]}` },
          { name: post.seoTitle ?? post.title, item: url },
        ].map((crumb, i) => ({ '@type': 'ListItem', position: i + 1, ...crumb })),
      },
      ...(faq
        ? [
            {
              '@type': 'FAQPage',
              '@id': `${url}#faq`,
              mainEntity: faq.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
            },
          ]
        : []),
    ],
  };
};
