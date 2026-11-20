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
 * Cards use the host's Chalkboard SE, Helvetica Neue and Menlo rather than the
 * site's Kalam, Archivo and Martian Mono, for the reason above. They are close enough in
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

/** Sketchbook palette — mirrors the final token block in global.css. */
const C = {
  paper: '#fdfcf9',
  card: '#ffffff',
  ink: '#1f1f1d',
  muted: '#45433f',
  orange: '#e8862e',
  orangeFill: '#f7b77a',
  mint: '#8fd3bd',
  mintSoft: '#d4efe5',
};

void oklchToHex; // kept for future oklch tokens

/** librsvg cannot load Kalam (WOFF2 only); Chalkboard SE is macOS's closest hand. */
const HAND = 'Chalkboard SE, Comic Sans MS, Marker Felt, cursive';
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

const AVG_ADVANCE = { display: 0.5, hand: 0.6, mono: 0.6 };

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
 * One card template for every page type: a hand-drawn notebook panel.
 *
 * Orange marker pill for the filing line, the statement in handwriting, an
 * orange squiggle beneath it, a dashed footer rail — the same sketchbook
 * grammar the site uses, so the card is recognisable at feed size.
 */
function card({ eyebrow, title, summary, footer }) {
  const titleSize = title.length > 78 ? 52 : title.length > 44 ? 62 : 78;
  const titleLines = wrap(title, { fontSize: titleSize, maxWidth: CONTENT_WIDTH - 40, kind: 'hand', maxLines: 3 });
  const summaryLines = summary
    ? wrap(summary, { fontSize: 26, maxWidth: CONTENT_WIDTH - 80, maxLines: 2 })
    : [];

  const titleTop = 200 + titleSize * 0.8;
  const lineStep = titleSize * 1.15;
  const titleBlock = titleTop + (titleLines.length - 1) * lineStep;
  const lastLineWidth = Math.min(
    CONTENT_WIDTH - 40,
    titleLines.at(-1).length * titleSize * AVG_ADVANCE.hand * 0.92,
  );
  const sq = titleBlock + 26;

  const pillWidth = Math.min(CONTENT_WIDTH - 40, eyebrow.length * 13.5 + 56);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${C.paper}"/>

  <!-- wobbly panel -->
  <path d="M44 52 C300 40 800 46 1152 38 C1162 220 1158 460 1160 630 C820 640 380 634 50 640 C40 460 46 230 44 52 Z"
    fill="${C.card}" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"/>

  <!-- eyebrow pill -->
  <path d="M${PAD + 4} 96 C${PAD + pillWidth * 0.4} 88 ${PAD + pillWidth * 0.8} 90 ${PAD + pillWidth} 94 C${PAD + pillWidth + 8} 110 ${PAD + pillWidth + 6} 130 ${PAD + pillWidth - 2} 142 C${PAD + pillWidth * 0.6} 148 ${PAD + pillWidth * 0.2} 146 ${PAD + 2} 144 C${PAD - 8} 128 ${PAD - 6} 108 ${PAD + 4} 96 Z"
    fill="${C.orangeFill}"/>
  ${textLines([eyebrow], {
    x: PAD + 26,
    y: 128,
    lineHeight: 0,
    'font-family': HAND,
    'font-weight': 700,
    'font-size': 24,
    fill: C.ink,
  })}

  <!-- sparks + mint dots -->
  <path d="M1052 92l14-14M1062 116l20-4M1036 80l2-18" stroke="${C.orange}" stroke-width="5" stroke-linecap="round" fill="none"/>
  <circle cx="1000" cy="150" r="9" fill="${C.mint}" stroke="${C.ink}" stroke-width="3"/>
  <circle cx="1060" cy="178" r="6" fill="${C.mint}" stroke="${C.ink}" stroke-width="3"/>
  <circle cx="1028" cy="214" r="7" fill="${C.mint}" stroke="${C.ink}" stroke-width="3"/>

  ${textLines(titleLines, {
    x: PAD + 4,
    y: titleTop,
    lineHeight: lineStep,
    'font-family': HAND,
    'font-size': titleSize,
    'font-weight': 700,
    fill: C.ink,
  })}

  <path d="M${PAD} ${sq + 6} C${PAD + lastLineWidth * 0.3} ${sq - 4} ${PAD + lastLineWidth * 0.65} ${sq} ${PAD + lastLineWidth} ${sq - 6}"
    stroke="${C.orange}" stroke-width="8" stroke-linecap="round" fill="none"/>

  ${textLines(summaryLines, {
    x: PAD + 4,
    y: sq + 64,
    lineHeight: 38,
    'font-family': DISPLAY,
    'font-size': 26,
    fill: C.muted,
  })}

  <path d="M${PAD} ${HEIGHT - 128} H${WIDTH - PAD}" stroke="${C.ink}" stroke-opacity=".35" stroke-width="3" stroke-dasharray="10 9" stroke-linecap="round"/>
  ${textLines([footer], {
    x: PAD + 4,
    y: `${HEIGHT - 82}`,
    lineHeight: 0,
    'font-family': HAND,
    'font-weight': 700,
    'font-size': 24,
    fill: C.ink,
  })}
  ${textLines(['cabrialesdev.netlify.app'], {
    x: WIDTH - PAD,
    y: `${HEIGHT - 82}`,
    lineHeight: 0,
    'text-anchor': 'end',
    'font-family': MONO,
    'font-size': 20,
    fill: C.muted,
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
function iconSvg({ size, padding = 0.14, background = C.paper }) {
  const inset = size * padding;
  const scale = (size - inset * 2) / 128;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${background}"/>
  <g transform="translate(${inset} ${inset}) scale(${scale})">
${ICON_MARK}
  </g>
</svg>`;
}

/** Shared with public/favicon.svg: mint blob, ink outline, hand-drawn M, orange tick. */
const ICON_MARK = `    <path d="M14 18C46 10 84 12 114 16c6 30 4 64 2 96-32 6-70 4-100 2C10 82 10 48 14 18Z" fill="${C.mint}" stroke="${C.ink}" stroke-width="7" stroke-linejoin="round"/>
    <path d="M34 92C36 70 38 52 40 36c8 14 16 28 24 40 8-14 16-28 26-42 2 18 2 38 4 58" fill="none" stroke="${C.ink}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M30 104c22-4 46-4 70-2" fill="none" stroke="${C.orange}" stroke-width="7" stroke-linecap="round"/>`;

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
