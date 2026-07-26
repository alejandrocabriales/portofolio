import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Blog collection.
 *
 * Uses the `glob` loader (Astro 5's Content Layer) rather than the legacy
 * `src/content/<name>` convention — it decouples where files live from the
 * collection name and is the supported path going forward.
 *
 * Schema notes:
 * - `draft` defaults to false and is filtered out of every production query,
 *   so an unfinished post can sit in the repo without leaking into the feed,
 *   the sitemap or the related-posts pool.
 * - `description` is required and length-capped because it doubles as the meta
 *   description and the OG summary. Letting it be optional is how posts end up
 *   with no search snippet.
 * - `updated` is separate from `published` so a corrected post can show an
 *   honest edit date without resetting its position in the feed.
 */
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    /**
     * Bounds are the SERP's, not an editorial preference. A title over ~70
     * characters and a description over ~160 are cut off in a result, and the
     * cut lands mid-word — so the last thing a searcher reads is a fragment.
     * Enforcing it here fails the build at the source of the problem, instead
     * of at `seo-validate` after the page has already been rendered.
     */
    title: z.string().min(20).max(70),
    description: z.string().min(70).max(160),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),

    /** One primary category — drives the archive routes. */
    category: z.enum([
      'React',
      'Next.js',
      'Astro',
      'Node.js',
      'TypeScript',
      'AI Engineering',
      'Architecture',
      'Performance',
      'Accessibility',
      'DevOps',
      'Security',
    ]),

    /** Free-form, lowercase. Used for related-post matching and tag archives. */
    tags: z.array(z.string().toLowerCase()).default([]),

    /** Pins the post to the top of the index. Keep to one or two. */
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),

    /** Optional hero/OG image. Falls back to a generated card when absent. */
    image: z
      .object({
        src: z.string(),
        alt: z.string(),
      })
      .optional(),

    /** Overrides the computed reading time when a post is code-heavy. */
    readingTimeOverride: z.number().positive().optional(),
  }),
});

export const collections = { blog };
