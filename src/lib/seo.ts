/**
 * URL and social-card helpers shared by the SEO head and the JSON-LD graph.
 *
 * Everything here exists to make one class of bug unrepresentable: relative
 * URLs in places that require absolute ones. `og:image`, `og:url`, `canonical`
 * and every `@id` in the structured-data graph are resolved against `SITE.url`
 * exactly once, here, instead of being concatenated by hand at each call site.
 */

import fs from 'node:fs';
import path from 'node:path';

import { SITE } from '@/config/site';

/**
 * Absolute URL for a site-relative path.
 *
 * Crawlers and social scrapers do resolve relative `og:` values in practice,
 * but inconsistently, and a card that fails to render is invisible feedback —
 * nobody reports it. Absolute is the only safe form.
 */
export function absoluteUrl(pathname: string): string {
  return new URL(pathname, SITE.url).href;
}

/**
 * The canonical URL for the page currently rendering.
 *
 * Built from the pathname alone, so a query string or fragment picked up from
 * the request can never split one page into several canonical identities.
 * `trailingSlash: 'always'` in the Astro config means the pathname already
 * carries its slash, which keeps this consistent with the sitemap.
 */
export function canonicalUrl(url: URL): string {
  return absoluteUrl(url.pathname);
}

/**
 * Resolve a page's social card, falling back to the site default.
 *
 * The existence check runs at build time in Node — this is a static site, so
 * `public/` is on disk while pages render. A missing per-page card therefore
 * degrades to the default card instead of shipping a 404 in `og:image`, which
 * is the failure mode that produces a blank grey rectangle on LinkedIn.
 */
export function resolveOgImage(candidate?: string | undefined): string {
  if (!candidate) return absoluteUrl(SITE.ogImage.path);
  if (candidate.startsWith('http://') || candidate.startsWith('https://')) return candidate;

  const onDisk = path.join(process.cwd(), 'public', candidate.replace(/^\//, ''));
  return absoluteUrl(fs.existsSync(onDisk) ? candidate : SITE.ogImage.path);
}

/**
 * Per-page card path for a generated slug, e.g. `og/blog/my-post.png`.
 *
 * Centralised because `scripts/generate-og.mjs` writes to the same shape — if
 * the two ever disagree, every card silently falls back to the default.
 */
export function ogImagePathFor(kind: 'blog' | 'work', slug: string): string {
  return `/og/${kind}/${slug}.png`;
}

/**
 * The SEO surface a route controls.
 *
 * Declared here rather than in `Seo.astro` so both the component and the layout
 * that forwards to it read the same definition — a `.astro` file can export a
 * type, but importing one couples the layout to the component's internals for
 * no gain.
 */
export interface SeoProps {
  title: string;
  description: string;
  /** Site-relative path to a social card. Falls back to the site default. */
  image?: string | undefined;
  imageAlt?: string | undefined;
  ogType?: 'website' | 'article' | 'profile' | undefined;
  /** Thin or duplicate routes opt out of the index but still pass link equity. */
  noindex?: boolean | undefined;
  /**
   * Site-relative path to a plain-markdown copy of this page, advertised as a
   * `rel="alternate"`. Set on posts, where a clean source form exists.
   */
  markdownAlternate?: string | undefined;
  /** Present on posts only; drives the `article:*` property set. */
  article?:
    | {
        published: Date;
        modified?: Date | undefined;
        section?: string | undefined;
        tags?: readonly string[] | undefined;
      }
    | undefined;
}

/**
 * Trim a string to a sane meta-description length on a word boundary.
 *
 * Google truncates around 155–160 characters on desktop. Cutting deliberately
 * beats letting the SERP cut mid-word, and an ellipsis is a weaker signal than
 * a sentence that ends where it meant to.
 */
export function clampDescription(text: string, max = 158): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max).replace(/[,.;:—-]$/, '')}…`;
}
