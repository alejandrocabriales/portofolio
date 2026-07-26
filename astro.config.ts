import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
// `ChangeFreqEnum` is a real TypeScript enum, so the string literals it holds
// are not assignable to `changefreq` on their own.
import sitemap, { ChangeFreqEnum } from '@astrojs/sitemap';

import { SITE } from './src/config/site';
import { seoValidate } from './integrations/seo-validate';
import { indexNow } from './integrations/indexnow';

const BLOG_DIR = path.resolve('./src/content/blog');

/**
 * Post slug → the date the post last meaningfully changed, for sitemap
 * `lastmod`.
 *
 * Read straight from the frontmatter with `fs` because `astro:content` is not
 * available while the config is evaluated. The parse is deliberately narrow —
 * three fields, line-anchored — and a file it cannot read is skipped rather
 * than guessed at, which costs that post a `lastmod` and nothing else.
 *
 * The alternative, stamping every URL with the build time, would tell crawlers
 * the entire site changed on every deploy. A `lastmod` that is never trusted is
 * worse than no `lastmod`: Google discounts the signal site-wide once it has
 * seen it lie.
 */
function readPostDates(): Map<string, string> {
  const dates = new Map<string, string>();
  if (!fs.existsSync(BLOG_DIR)) return dates;

  for (const file of fs.readdirSync(BLOG_DIR)) {
    if (!/\.mdx?$/.test(file)) continue;

    const source = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8');
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
    if (!frontmatter || /^draft:\s*true\s*$/m.test(frontmatter)) continue;

    const raw =
      frontmatter.match(/^updated:\s*(\S+)/m)?.[1] ?? frontmatter.match(/^published:\s*(\S+)/m)?.[1];
    const parsed = raw ? new Date(raw.replace(/['"]/g, '')) : null;
    if (!parsed || Number.isNaN(parsed.valueOf())) continue;

    dates.set(file.replace(/\.mdx?$/, ''), parsed.toISOString());
  }

  return dates;
}

const POST_DATES = readPostDates();

/**
 * Committer date of the most recent commit touching any of `files`, as ISO.
 *
 * The pages that aren't posts have no date in their content — the index is
 * assembled from `src/data/*.ts`, a case study from `projects.ts` — so git is
 * the only honest record of when they last changed. Passing several paths and
 * taking the newest is deliberate: the index changes when the experience data
 * changes, not only when `index.astro` does.
 *
 * Returns `null` when git is unavailable or the file is untracked, which costs
 * that URL a `lastmod` and nothing else. Netlify does a shallow clone but keeps
 * commit metadata, so this works there; a source tarball would not.
 */
function gitLastmod(...files: string[]): string | null {
  const dates = files
    .map((file) => {
      try {
        const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', file], {
          cwd: process.cwd(),
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
        return out ? new Date(out) : null;
      } catch {
        return null;
      }
    })
    .filter((date): date is Date => date !== null && !Number.isNaN(date.valueOf()));

  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((date) => date.valueOf()))).toISOString();
}

/** Sources that decide when a given route's content last actually changed. */
const SITE_DATA = ['src/config/site.ts', 'src/data'];
const LASTMOD = {
  home: gitLastmod('src/pages/index.astro', ...SITE_DATA),
  work: gitLastmod('src/pages/work/[slug].astro', 'src/data/projects.ts'),
  blogIndex: gitLastmod('src/pages/blog/index.astro', 'src/content/blog'),
};

// https://astro.build/config
export default defineConfig({
  /**
   * Required for canonical URLs, the sitemap and absolute OG image paths.
   * Read from `src/config/site.ts` so the domain is declared exactly once.
   */
  site: SITE.url,

  /**
   * One URL shape, everywhere.
   *
   * Every internal link in the codebase already ends in `/`. Leaving the
   * default (`'ignore'`) lets `/blog` and `/blog/` both resolve, which means a
   * crawler can find two URLs for one page and has to pick a canonical for us.
   * `'always'` plus directory output makes the served URL, the canonical tag
   * and the sitemap entry byte-identical.
   */
  trailingSlash: 'always',
  build: { format: 'directory' },

  /**
   * Prefetch every internal link once it enters the viewport.
   *
   * The default (`data-astro-prefetch` opt-in, warmed on hover) is the right
   * call for a large site, where speculative fetching wastes real bandwidth.
   * This site is seven static pages of text — the whole thing is smaller than
   * one photograph — so the cautious setting buys nothing and costs a visible
   * pause on every navigation. Interaction latency is a Core Web Vital, and
   * time on site is what the latency is spent against.
   */
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },

  integrations: [
    mdx(),
    sitemap({
      /**
       * Tag archives ship `noindex` (they are filtered views of `/blog/` with
       * no prose of their own). A sitemap is a list of pages worth indexing, so
       * listing a `noindex` URL is a contradiction the crawler has to resolve.
       */
      filter: (page) => !page.includes('/blog/tag/'),

      /**
       * Priority is relative *within* this site only — it says nothing about
       * how this site compares to anyone else's. The index outranks the case
       * studies, which outrank individual posts.
       *
       * `lastmod` comes from the post's frontmatter where there is one — that
       * keeps the sitemap agreeing with the `dateModified` in the page's
       * JSON-LD — and from git everywhere else. Never from build time: see
       * `readPostDates` above.
       */
      serialize(item) {
        const route = new URL(item.url).pathname;
        const { MONTHLY, WEEKLY, YEARLY } = ChangeFreqEnum;
        const withDate = (lastmod: string | null | undefined) => (lastmod ? { lastmod } : {});

        if (route === '/') {
          return { ...item, changefreq: MONTHLY, priority: 1.0, ...withDate(LASTMOD.home) };
        }
        if (route.startsWith('/work/')) {
          return { ...item, changefreq: YEARLY, priority: 0.8, ...withDate(LASTMOD.work) };
        }
        if (route === '/blog/') {
          return { ...item, changefreq: WEEKLY, priority: 0.7, ...withDate(LASTMOD.blogIndex) };
        }
        if (route.startsWith('/blog/')) {
          const slug = route.replace(/^\/blog\/|\/$/g, '');
          return { ...item, changefreq: YEARLY, priority: 0.6, ...withDate(POST_DATES.get(slug)) };
        }

        return { ...item, changefreq: MONTHLY, priority: 0.5 };
      },
    }),

    /* Runs against the built HTML, so it sees what a crawler sees. Ordered
     * last: there is no point announcing a build that failed validation. */
    seoValidate(),
    indexNow({ site: SITE.url, key: SITE.indexNowKey }),
  ],

  markdown: {
    shikiConfig: {
      /**
       * Dual themes emit `--shiki-light` / `--shiki-dark` custom properties on
       * every token, so switching is a CSS concern — no second highlight pass,
       * no re-render, and no JS. Vitesse is warm-toned, which sits with the
       * amber anchor instead of fighting it.
       */
      themes: {
        light: 'vitesse-light',
        dark: 'vitesse-dark',
      },
      /** Long lines wrap rather than forcing a horizontal scrollbar on mobile. */
      wrap: true,
    },
  },

  /**
   * Tailwind v4 ships as a Vite plugin — `@astrojs/tailwind` is deprecated in
   * Astro 5. Design tokens live in the stylesheet's `@theme` block rather than
   * a separate JS config, which keeps colour and type in one place.
   */
  vite: {
    plugins: [tailwindcss()],
  },
});
