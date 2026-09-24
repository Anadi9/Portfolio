import { BYLINE, ORIGIN, PORTFOLIO_ORIGIN } from '@/components/Seo';
import { hasCover, ogImageFor, streamPath, type Post, type Stream } from '@/data/notes';

/** Same `@id` as the Person node on `/rescue`, so every post's author resolves to one entity. */
export const PERSON_ID = `${PORTFOLIO_ORIGIN}/#person`;

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
        publisher: author,
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
    ],
  };
};
