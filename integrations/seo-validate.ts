import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';

/**
 * Post-build SEO validation.
 *
 * Everything checked here is invisible in a browser and invisible in review: a
 * duplicated `<title>`, a second `<h1>`, a description that will be cut off in
 * a result. None of it breaks a page, so none of it gets noticed — it just
 * quietly costs traffic until someone audits the site months later.
 *
 * The checks run against the built HTML rather than the components, so they see
 * what a crawler sees, including anything a layout injected.
 *
 * Severity is deliberate. A missing `<title>` or unparseable JSON-LD is an
 * error, because the page is broken for its machine audience and shipping it is
 * strictly worse than not shipping. Everything else warns: length bounds are
 * guidance, not correctness, and a build that fails over a 168-character
 * description is a build people learn to bypass.
 */

/** SERP truncation bounds. Outside these a page still works, it just reads badly. */
const TITLE = { min: 20, max: 70 };
const DESCRIPTION = { min: 70, max: 165 };

interface PageFacts {
  route: string;
  title: string | null;
  description: string | null;
  canonical: string | null;
  noindex: boolean;
  h1Count: number;
  imagesWithoutAlt: number;
  jsonLd: string[];
  /** Site-relative link targets, for the dead-internal-link check. */
  internalLinks: string[];
}

const between = (value: string, open: RegExp) => open.exec(value)?.[1]?.trim() ?? null;

function extract(route: string, html: string): PageFacts {
  const head = html.slice(0, html.indexOf('</head>') + 1 || html.length);

  return {
    route,
    title: between(head, /<title[^>]*>([\s\S]*?)<\/title>/i),
    description: between(head, /<meta\s+name="description"\s+content="([^"]*)"/i),
    canonical: between(head, /<link\s+rel="canonical"\s+href="([^"]*)"/i),
    noindex: /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(head),
    h1Count: (html.match(/<h1[\s>]/gi) ?? []).length,
    // `alt=""` counts as present — that is the correct markup for a decorative
    // image, and treating it as missing would train people to write filler.
    imagesWithoutAlt: (html.match(/<img\b(?![^>]*\balt=)[^>]*>/gi) ?? []).length,
    jsonLd: [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map(
      (match) => match[1] ?? '',
    ),
    internalLinks: [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)]
      .map((match) => match[1] ?? '')
      // Only same-origin paths. Everything else — mailto, external, and the
      // in-page anchors that carry no routing claim — is somebody else's
      // problem or no claim at all.
      .filter((href) => href.startsWith('/'))
      .map((href) => href.split('#')[0] ?? '')
      .filter(Boolean),
  };
}

async function collect(dir: string, base: string, out: string[] = []): Promise<string[]> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    // Pagefind ships prebuilt HTML fixtures that are not site pages.
    if (entry.isDirectory() && entry.name !== 'pagefind' && entry.name !== '_astro') {
      await collect(full, base, out);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

export function seoValidate(): AstroIntegration {
  return {
    name: 'seo-validate',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const files = await collect(root, root);

        const errors: string[] = [];
        const warnings: string[] = [];
        const pages: PageFacts[] = [];

        for (const file of files) {
          const route = `/${path.relative(root, file).replace(/index\.html$/, '').replace(/\\/g, '/')}`;
          const facts = extract(route, await fs.readFile(file, 'utf8'));
          pages.push(facts);

          if (!facts.title) errors.push(`${route} — no <title>`);
          if (!facts.description) errors.push(`${route} — no meta description`);
          if (!facts.jsonLd.length) warnings.push(`${route} — no JSON-LD`);

          for (const block of facts.jsonLd) {
            try {
              JSON.parse(block);
            } catch (error) {
              errors.push(`${route} — unparseable JSON-LD: ${(error as Error).message}`);
            }
          }

          if (facts.h1Count !== 1) {
            warnings.push(`${route} — ${facts.h1Count} <h1> elements, expected exactly 1`);
          }
          if (facts.imagesWithoutAlt > 0) {
            warnings.push(`${route} — ${facts.imagesWithoutAlt} <img> without alt`);
          }
          if (!facts.noindex && !facts.canonical) {
            warnings.push(`${route} — indexable but no canonical`);
          }

          const titleLength = facts.title?.length ?? 0;
          if (facts.title && (titleLength < TITLE.min || titleLength > TITLE.max)) {
            warnings.push(`${route} — title is ${titleLength} chars (want ${TITLE.min}–${TITLE.max})`);
          }

          const descriptionLength = facts.description?.length ?? 0;
          if (
            facts.description &&
            (descriptionLength < DESCRIPTION.min || descriptionLength > DESCRIPTION.max)
          ) {
            warnings.push(
              `${route} — description is ${descriptionLength} chars (want ${DESCRIPTION.min}–${DESCRIPTION.max})`,
            );
          }
        }

        /* Duplicates matter only between pages that compete in the index, so
         * `noindex` routes are excluded — a tag archive echoing the blog index
         * is the intended behaviour, not a defect. */
        const indexable = pages.filter((page) => !page.noindex);

        for (const [field, values] of [
          ['title', indexable.map((page) => [page.route, page.title] as const)],
          ['description', indexable.map((page) => [page.route, page.description] as const)],
        ] as const) {
          const seen = new Map<string, string[]>();
          for (const [route, value] of values) {
            if (!value) continue;
            seen.set(value, [...(seen.get(value) ?? []), route]);
          }
          for (const [value, routes] of seen) {
            if (routes.length > 1) {
              warnings.push(`duplicate ${field} on ${routes.join(', ')} — "${value.slice(0, 60)}…"`);
            }
          }
        }

        /* Dead internal links.
         *
         * A 404 behind a link on a live page wastes crawl budget and drops the
         * link equity the page meant to pass. These are also the easiest thing
         * in the whole audit to break by hand — renaming a route updates the
         * page that defines it and nothing that points at it. Resolved against
         * the build output, so the check knows about `public/` assets and
         * endpoint routes as well as pages. */
        // `withFileTypes` is avoided here: reading a Dirent's parent directory
        // needs `parentPath`, which only exists from Node 20.12. Plain string
        // entries work on every version this project supports, and a directory
        // landing in the set is harmless — nothing links to one.
        const onDisk = new Set<string>();
        for (const entry of await fs.readdir(root, { recursive: true })) {
          const rel = String(entry).replace(/\\/g, '/');
          onDisk.add(`/${rel}`);
          if (rel.endsWith('index.html')) onDisk.add(`/${rel.replace(/index\.html$/, '')}`);
        }

        for (const page of pages) {
          for (const href of new Set(page.internalLinks)) {
            const target = href.endsWith('/') || href.includes('.') ? href : `${href}/`;
            if (!onDisk.has(target) && !onDisk.has(`${target}index.html`)) {
              warnings.push(`${page.route} — link to ${href} has no target in the build`);
            }
          }
        }

        for (const warning of warnings) logger.warn(warning);
        if (errors.length) {
          for (const error of errors) logger.error(error);
          throw new Error(`SEO validation failed with ${errors.length} error(s).`);
        }

        logger.info(
          `${pages.length} pages checked, ${indexable.length} indexable, ${warnings.length} warning(s).`,
        );
      },
    },
  };
}
