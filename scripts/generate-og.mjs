/**
 * Generates the social cards and the raster icon set into `public/`.
 *
 * Run with `pnpm og`. Output is committed, not built.
 *
 * ## Why this is a committed artefact and not a build step
 *
 * The cards are SVG rendered to PNG by sharp, which rasterises text through
 * librsvg — and librsvg resolves fonts through the operating system, not
 * through anything this repo controls. librsvg ignores `@font-face`, so the
 * project's webfonts (which ship as WOFF2 only) cannot be handed to it at all.
 *
 * That makes a render inside a CI container non-reproducible: the same SVG
 * would come out with different metrics, different line breaks and possibly a
 * different typeface than it does here. Generating locally and committing the
 * PNGs removes the variable entirely — what is reviewed is what ships.
 *
 * The cost is that this must be re-run when a post, a project or the site's
 * identity changes. `pnpm og` is idempotent, so re-running it always is fine.
 *
 * ## Typography
 *
 * Cards use the host's Helvetica Neue and Menlo rather than the site's Archivo
 * and Martian Mono, for the reason above. They are close enough in
 * proportion that the card reads as the same system at feed size, which is the
 * only size anyone sees it at.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');

/** Must stay in step with `SITE.ogImage` — that is what the meta tags declare. */
const WIDTH = 1200;
const HEIGHT = 675;

/* ---------------------------------------------------------------------------
 * Palette
 *
 * Converted from the `oklch()` values in `src/styles/global.css` rather than
 * eyeballed, so the card and the page are the same colours. librsvg predates
 * `oklch()` support, which is why the conversion happens here.
 * ------------------------------------------------------------------------ */

function oklchToHex(L, C, h) {
  const rad = (h * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);

  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];

  return `#${linear
    .map((v) => {
      const srgb = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
      return Math.round(Math.min(1, Math.max(0, srgb)) * 255)
        .toString(16)
        .padStart(2, '0');
    })
    .join('')}`;
}

const C = {
  paper: oklchToHex(0.78, 0.14, 72),
  ink: oklchToHex(0.19, 0.03, 55),
  /** The safelight — the card is the site's opening amber field. */
  field: oklchToHex(0.78, 0.14, 72),
  onField: oklchToHex(0.19, 0.03, 55),
  onFieldMuted: oklchToHex(0.3, 0.05, 56),
};

const DISPLAY = 'Helvetica Neue, Helvetica, Arial, sans-serif';
const MONO = 'Menlo, DejaVu Sans Mono, monospace';

/* ---------------------------------------------------------------------------
 * Text layout
 *
 * There is no font-metrics library here, so line breaking uses a per-typeface
 * average advance width. It is an approximation, but a conservative one: the
 * ratios below are tuned slightly wide, so a line errs towards breaking early
 * rather than towards overflowing the card.
 * ------------------------------------------------------------------------ */

const AVG_ADVANCE = { display: 0.5, mono: 0.6 };

function wrap(text, { fontSize, maxWidth, kind = 'display', maxLines = 3 }) {
  const perLine = Math.floor(maxWidth / (fontSize * AVG_ADVANCE[kind]));
  const lines = [];
  let current = '';

  for (const word of text.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= perLine) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  // Anything that did not fit is signalled, not silently dropped.
  const rendered = lines.join(' ');
  if (rendered.length < text.replace(/\s+/g, ' ').length && lines.length === maxLines) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[,.;:—-]$/, '')}…`;
  }

  return lines;
}

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

function textLines(lines, { x, y, lineHeight, ...attrs }) {
  // Coerced: a string `y` would concatenate with the line offset instead of
  // adding to it, and the text would land silently off-canvas.
  const top = Number(y);
  const step = Number(lineHeight);

  return lines
    .map((line, index) => {
      const attributes = Object.entries(attrs)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');
      return `<text x="${x}" y="${top + index * step}" ${attributes}>${escapeXml(line)}</text>`;
    })
    .join('');
}

/* ---------------------------------------------------------------------------
 * The card
 * ------------------------------------------------------------------------ */

const PAD = 72;
const CONTENT_WIDTH = WIDTH - PAD * 2;

/**
 * One card template for every page type: the site's safelight field.
 *
 * Mono filing line at the top, the statement in heavy white type, a white rule
 * and a footer rail — the same field and spec-sheet grammar the home page opens
 * with, so a recruiter who has seen the site recognises the card unread.
 */
function card({ eyebrow, title, summary, footer }) {
  // Longer titles step down through three sizes rather than wrapping to five
  // lines — the card is read at thumbnail size.
  const titleSize = title.length > 78 ? 56 : title.length > 44 ? 68 : 84;
  const titleLines = wrap(title, { fontSize: titleSize, maxWidth: CONTENT_WIDTH, maxLines: 3 });
  const summaryLines = summary
    ? wrap(summary, { fontSize: 26, maxWidth: CONTENT_WIDTH - 40, maxLines: 2 })
    : [];

  // Baseline of the first line: the cap height clears the rule at y=139.
  const titleTop = 168 + titleSize * 0.8;
  const titleBlock = titleTop + (titleLines.length - 1) * (titleSize * 1.02);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${C.field}"/>

  <rect x="${PAD}" y="88" width="28" height="8" fill="${C.onField}"/>
  ${textLines([eyebrow.toUpperCase()], {
    x: PAD + 44,
    y: 98,
    lineHeight: 0,
    'font-family': MONO,
    'font-size': 20,
    'letter-spacing': 2.4,
    fill: C.onFieldMuted,
  })}

  <rect x="${PAD}" y="136" width="${CONTENT_WIDTH}" height="3" fill="${C.onField}"/>

  ${textLines(titleLines, {
    x: PAD,
    y: titleTop,
    lineHeight: titleSize * 1.02,
    'font-family': DISPLAY,
    'font-size': titleSize,
    'font-weight': 800,
    'letter-spacing': -titleSize * 0.035,
    fill: C.onField,
  })}

  ${textLines(summaryLines, {
    x: PAD,
    y: titleBlock + 64,
    lineHeight: 38,
    'font-family': DISPLAY,
    'font-size': 26,
    fill: C.onFieldMuted,
  })}

  <rect x="${PAD}" y="${HEIGHT - 116}" width="${CONTENT_WIDTH}" height="1.5" fill="${C.onFieldMuted}"/>
  ${textLines([footer.toUpperCase()], {
    x: PAD,
    y: `${HEIGHT - 68}`,
    lineHeight: 0,
    'font-family': MONO,
    'font-size': 20,
    'letter-spacing': 2,
    fill: C.onField,
  })}
  ${textLines(['CABRIALESDEV.NETLIFY.APP'], {
    x: WIDTH - PAD,
    y: `${HEIGHT - 68}`,
    lineHeight: 0,
    'text-anchor': 'end',
    'font-family': MONO,
    'font-size': 20,
    'letter-spacing': 2,
    fill: C.onFieldMuted,
  })}
</svg>`;
}

async function writePng(svg, relativePath) {
  const target = path.join(PUBLIC, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  // `compressionLevel: 9` with `palette` roughly halves these files; the cards
  // are flat colour and large type, so the palette reduction is lossless here
  // in every way that matters at feed size.
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toFile(target);
  console.log(`  ${relativePath}`);
}

/* ---------------------------------------------------------------------------
 * Icons
 * ------------------------------------------------------------------------ */

/**
 * The favicon mark on an opaque background.
 *
 * PNG icons cannot carry the `prefers-color-scheme` rule that `favicon.svg`
 * uses, and a transparent icon inverts unpredictably against browser and OS
 * chrome. Baking the paper background in is the predictable choice.
 *
 * `padding` exists for the maskable variant: Android crops icons to whatever
 * shape the launcher uses, and anything inside the outer 10% can be cut.
 */
function iconSvg({ size, padding = 0.14, background = C.ink }) {
  const inset = size * padding;
  const scale = (size - inset * 2) / 128;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${background}"/>
  <g transform="translate(${inset} ${inset}) scale(${scale})">
    <path d="M22 102V26l42 50 42-50v76" stroke="${C.paper}" stroke-width="15" fill="none" stroke-linejoin="miter"/>
    <rect x="88" y="94" width="30" height="12" fill="${C.paper}"/>
  </g>
</svg>`;
}

/* ---------------------------------------------------------------------------
 * Sources
 *
 * Project and post metadata are parsed from source rather than imported: this
 * is a plain Node script with no TypeScript loader and no Astro runtime, so
 * `src/data/projects.ts` and `astro:content` are both out of reach.
 * ------------------------------------------------------------------------ */

async function readProjects() {
  const source = await fs.readFile(path.join(ROOT, 'src/data/projects.ts'), 'utf8');
  const field = (block, name) =>
    block.match(new RegExp(`${name}:\\s*(?:'([^']*)'|"([^"]*)"|\`([^\`]*)\`)`))?.slice(1).find(Boolean) ?? '';

  return [...source.matchAll(/\{\s*slug: '([^']+)'([\s\S]*?)\n  \}/g)].map(([, slug, block]) => ({
    slug,
    name: field(block, 'name'),
    context: field(block, 'context'),
    year: field(block, 'year'),
    summary: field(block, 'summary'),
    impact: field(block, 'impact'),
  }));
}

async function readPosts() {
  const dir = path.join(ROOT, 'src/content/blog');
  const files = await fs.readdir(dir).catch(() => []);
  const posts = [];

  for (const file of files) {
    if (!/\.mdx?$/.test(file)) continue;
    const source = await fs.readFile(path.join(dir, file), 'utf8');
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
    if (!frontmatter) continue;

    const field = (name) =>
      frontmatter.match(new RegExp(`^${name}:\\s*(?:'([^']*)'|"([^"]*)"|(.*))$`, 'm'))?.slice(1).find(Boolean)?.trim() ?? '';

    // Drafts have no route in production, so a card for one would be an orphan.
    if (/^draft:\s*true\s*$/m.test(frontmatter)) continue;

    posts.push({
      slug: file.replace(/\.mdx?$/, ''),
      title: field('title'),
      description: field('description'),
      category: field('category'),
      published: field('published'),
    });
  }

  return posts;
}

/* ------------------------------------------------------------------------ */

async function main() {
  console.log('Social cards');

  await writePng(
    card({
      eyebrow: 'Manuel Cabriales Toledo',
      title: 'Systems that hold up in production.',
      summary:
        'Senior full stack engineer. React, Next.js, Node and PostgreSQL — nine years of shipped work.',
      footer: 'Senior full stack engineer · Montevideo, UY',
    }),
    'og/default.png',
  );

  for (const project of await readProjects()) {
    await writePng(
      card({
        eyebrow: `Case study · ${project.context}`,
        title: project.name,
        summary: project.impact ? `${project.summary} ${project.impact}` : project.summary,
        footer: `${project.year} · Manuel Cabriales Toledo`,
      }),
      `og/work/${project.slug}.png`,
    );
  }

  for (const post of await readPosts()) {
    await writePng(
      card({
        eyebrow: `Writing · ${post.category}`,
        title: post.title,
        summary: post.description,
        footer: `${post.published} · Manuel Cabriales Toledo`,
      }),
      `og/blog/${post.slug}.png`,
    );
  }

  console.log('Icons');
  await writePng(iconSvg({ size: 32, padding: 0.08 }), 'icon-32.png');
  await writePng(iconSvg({ size: 192, padding: 0.12 }), 'icon-192.png');
  await writePng(iconSvg({ size: 512, padding: 0.12 }), 'icon-512.png');
  await writePng(iconSvg({ size: 512, padding: 0.22 }), 'icon-512-maskable.png');
  // iOS ignores transparency and rounds the corners itself, so this is the
  // same mark with a slightly tighter inset.
  await writePng(iconSvg({ size: 180, padding: 0.14 }), 'apple-touch-icon.png');
}

await main();
