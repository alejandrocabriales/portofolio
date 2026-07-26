import type { APIRoute } from 'astro';

import { PROJECTS } from '@/data/projects';
import { getPublishedPosts } from '@/lib/posts';
import { absoluteUrl } from '@/lib/seo';
import {
  blogPostingNode,
  personNode,
  projectNode,
  websiteNode,
  type SchemaNode,
} from '@/lib/schema';

/**
 * The whole site's structured data as one document, at `/schema/site.json`.
 *
 * Each page already carries the slice of the graph that describes it. This is
 * the same vocabulary assembled corpus-wide, so a consumer that wants to know
 * what exists here can read one file instead of crawling seven pages and
 * stitching the `@id` references back together itself.
 *
 * Built from the same node builders the pages use, so the two cannot disagree —
 * a corpus endpoint maintained separately from the pages it summarises is worse
 * than none, because it looks authoritative while going stale.
 */
export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();

  const nodes: SchemaNode[] = [
    personNode(),
    websiteNode(),
    ...PROJECTS.map((project) => projectNode(project, absoluteUrl(`/work/${project.slug}/`))),
    ...posts.map((post) => {
      const url = absoluteUrl(`/blog/${post.id}/`);
      return blogPostingNode(post, url, absoluteUrl(`/og/blog/${post.id}.png`));
    }),
  ];

  /* No headers set here on purpose. This is a static build, so the endpoint
   * writes a file and the Response's headers are discarded — the content type,
   * CORS and `X-Robots-Tag` for `/schema/*` are set in `public/_headers`, which
   * is the only layer that actually serves them. */
  return new Response(JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }, null, 2));
};
