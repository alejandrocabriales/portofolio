import type { APIRoute, GetStaticPaths } from 'astro';

import { getPublishedPosts, postPath, type Post } from '@/lib/posts';
import { SITE } from '@/config/site';
import { absoluteUrl } from '@/lib/seo';

/**
 * A plain-markdown copy of every post, at `/blog/<slug>.md`.
 *
 * Increasingly the thing reading a post is an assistant summarising it for
 * someone, not a browser. Handing that reader the source instead of a styled
 * document removes an entire class of misquote: no nav text bleeding into the
 * excerpt, no code block mangled by HTML parsing, no ambiguity about which
 * paragraph is the article.
 *
 * Announced on the HTML page as `<link rel="alternate" type="text/markdown">`,
 * so it is discoverable rather than something you have to already know about.
 *
 * The frontmatter is rewritten rather than passed through: the source carries
 * build flags (`draft`, `featured`, `readingTimeOverride`) that mean nothing to
 * a reader, and omits the canonical URL, which means everything.
 */
export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
};

export const GET: APIRoute = ({ props }) => {
  const post = props['post'] as Post;

  const frontmatter = [
    '---',
    `title: ${JSON.stringify(post.data.title)}`,
    `description: ${JSON.stringify(post.data.description)}`,
    `author: ${JSON.stringify(SITE.name)}`,
    `published: ${post.data.published.toISOString()}`,
    ...(post.data.updated ? [`updated: ${post.data.updated.toISOString()}`] : []),
    `category: ${JSON.stringify(post.data.category)}`,
    `tags: [${post.data.tags.map((tag) => JSON.stringify(tag)).join(', ')}]`,
    `canonical: ${absoluteUrl(postPath(post))}`,
    '---',
    '',
  ].join('\n');

  return new Response(`${frontmatter}${post.body ?? ''}`, {
    headers: {
      // `charset` is explicit: without it the em dashes and typographic quotes
      // this site uses heavily are decoded as latin-1 by strict clients.
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
};
