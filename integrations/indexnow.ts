import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';

/**
 * Submits the site's URLs to IndexNow after a production build.
 *
 * IndexNow is a push protocol: one request tells Bing, Yandex, Seznam and
 * Naver that a set of URLs changed, instead of waiting for them to come back
 * and look. On a site that publishes rarely this is the difference between a
 * new post being found this afternoon and being found next month. Google does
 * not participate — it still has to be told through Search Console.
 *
 * ## Two things this deliberately refuses to do
 *
 * **It does not run outside a Netlify production build.** `CONTEXT` is set by
 * Netlify and is `'production'` only for the live site. Submitting from a local
 * build or a deploy preview would announce URLs the production host has never
 * served; enough 404s against a key and the key is rejected outright, which
 * takes the real deploys down with it.
 *
 * **It does not fail the build.** A search engine's ingestion endpoint being
 * slow is not a reason to refuse to deploy a site. Errors are logged and the
 * build continues.
 */

const ENDPOINT = 'https://api.indexnow.org/indexnow';

interface Options {
  site: string;
  /**
   * The key, which must also be served as plain text at `/<key>.txt` — that
   * file is how the endpoint verifies the submitter owns the host.
   */
  key: string;
}

async function collectRoutes(dir: string, base: string, out: string[] = []): Promise<string[]> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'pagefind' && entry.name !== '_astro') {
      await collectRoutes(full, base, out);
    } else if (entry.isFile() && entry.name === 'index.html') {
      out.push(`/${path.relative(base, path.dirname(full)).replace(/\\/g, '/')}`.replace(/^\/\.$/, '/'));
    }
  }
  return out;
}

export function indexNow({ site, key }: Options): AstroIntegration {
  return {
    name: 'indexnow',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        if (process.env['CONTEXT'] !== 'production') {
          logger.info('Skipped — not a Netlify production build.');
          return;
        }

        const root = fileURLToPath(dir);
        const routes = await collectRoutes(root, root);

        const urlList = routes
          // 404 is reachable but is not a page anyone should be sent to.
          .filter((route) => !route.startsWith('/404'))
          .map((route) => new URL(route.endsWith('/') ? route : `${route}/`, site).href);

        if (urlList.length === 0) return;

        try {
          const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
              host: new URL(site).host,
              key,
              keyLocation: new URL(`/${key}.txt`, site).href,
              urlList,
            }),
          });

          if (response.ok) {
            logger.info(`Submitted ${urlList.length} URLs (${response.status}).`);
          } else {
            logger.warn(`Endpoint returned ${response.status} ${response.statusText}.`);
          }
        } catch (error) {
          logger.warn(`Submission failed: ${(error as Error).message}`);
        }
      },
    },
  };
}
