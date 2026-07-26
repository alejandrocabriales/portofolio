import type { APIRoute } from 'astro';

import { absoluteUrl } from '@/lib/seo';

/**
 * `/schemamap.xml` — an index of this site's structured-data endpoints.
 *
 * Same idea as a sitemap, one level up: a sitemap lists pages a crawler should
 * fetch, a schemamap lists the machine-readable descriptions of what those
 * pages are about. Advertised from `robots.txt` via the `Schemamap:` directive,
 * so it is findable the same way the sitemap is.
 *
 * One entry today. It is a list rather than a single hard-coded URL because the
 * point of the file is that the set can grow without consumers needing to be
 * told.
 */
const ENDPOINTS = ['/schema/site.json'];

export const GET: APIRoute = () => {
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<schemamap xmlns="https://schemamap.org/schemas/schemamap/0.1">',
    ...ENDPOINTS.map((endpoint) => `  <schema><loc>${absoluteUrl(endpoint)}</loc></schema>`),
    '</schemamap>',
    '',
  ].join('\n');

  return new Response(body);
};
