import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';

import { getPublishedPosts, postPath } from '@/lib/posts';
import { SITE } from '@/config/site';

/**
 * RSS feed at /rss.xml.
 *
 * Full descriptions rather than full content: the goal is to pull readers to the
 * site (where the share buttons and the rest of the portfolio are), not to
 * replace it. Categories carry both the post's category and its tags so feed
 * readers can filter.
 */
export const GET: APIRoute = async (context) => {
  const posts = await getPublishedPosts();

  return rss({
    title: `${SITE.name} — Writing`,
    description:
      'Notes on React, Next.js, Node, TypeScript, architecture and the LLM tooling I use in production.',
    // `context.site` is derived from `site` in astro.config, which is always set.
    site: context.site ?? SITE.url,
    trailingSlash: true,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.published,
      link: postPath(post),
      categories: [post.data.category, ...post.data.tags],
    })),
    customData: `<language>${SITE.locale}</language>`,
  });
};
