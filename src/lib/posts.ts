import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

/** Words per minute for technical prose — deliberately below the 250 wpm often
 * quoted for fiction, because readers stop and re-read code. */
const WPM = 200;

/**
 * Every published post, newest first.
 *
 * Drafts are excluded in production but kept during `astro dev`, so a
 * work-in-progress is previewable locally without ever reaching the feed, the
 * sitemap or the related-posts pool.
 */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
  return posts.sort((a, b) => b.data.published.valueOf() - a.data.published.valueOf());
}

/** Featured posts first, then the rest — both already newest-first. */
export async function getIndexedPosts(): Promise<Post[]> {
  const posts = await getPublishedPosts();
  return [...posts.filter((p) => p.data.featured), ...posts.filter((p) => !p.data.featured)];
}

/**
 * Estimated reading time in minutes, always at least 1.
 *
 * Fenced code blocks are counted at a third of their word count: skimming a
 * snippet is faster than reading prose, but counting them at zero understates
 * a code-heavy post badly. `readingTimeOverride` wins when set.
 */
export function readingTime(post: Post): number {
  if (post.data.readingTimeOverride) return post.data.readingTimeOverride;

  const body = post.body ?? '';
  const codeBlocks = body.match(/```[\s\S]*?```/g) ?? [];
  const codeWords = codeBlocks.join(' ').split(/\s+/).filter(Boolean).length;
  const proseWords = body.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length;

  return Math.max(1, Math.round((proseWords + codeWords / 3) / WPM));
}

/** Previous (older) and next (newer) post in publication order. */
export async function getSiblings(post: Post): Promise<{ prev: Post | null; next: Post | null }> {
  const posts = await getPublishedPosts();
  const i = posts.findIndex((p) => p.id === post.id);
  if (i === -1) return { prev: null, next: null };
  // The array is newest-first, so the *next* index is the older post.
  return { prev: posts[i + 1] ?? null, next: posts[i - 1] ?? null };
}

/**
 * Related posts, scored by shared tags then same category.
 *
 * Returns fewer than `limit` rather than padding with unrelated posts — a
 * "related" list that isn't related teaches readers to ignore it.
 */
export async function getRelated(post: Post, limit = 3): Promise<Post[]> {
  const posts = await getPublishedPosts();
  const tags = new Set(post.data.tags);

  return posts
    .filter((p) => p.id !== post.id)
    .map((p) => {
      const shared = p.data.tags.filter((t) => tags.has(t)).length;
      const score = shared * 2 + (p.data.category === post.data.category ? 1 : 0);
      return { post: p, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.post);
}

/** Every tag with its post count, most-used first. */
export async function getTags(): Promise<{ tag: string; count: number }[]> {
  const posts = await getPublishedPosts();
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** URL path for a post. Centralised so the route shape can change in one place. */
export function postPath(post: Post): string {
  return `/blog/${post.id}/`;
}
