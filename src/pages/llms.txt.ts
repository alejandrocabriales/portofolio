import type { APIRoute } from 'astro';

import { SITE, SOCIALS, AVAILABILITY } from '@/config/site';
import { PROJECTS } from '@/data/projects';
import { getPublishedPosts } from '@/lib/posts';
import { absoluteUrl } from '@/lib/seo';

/**
 * `/llms.txt` — the site, in the shape an assistant can actually use.
 *
 * The llmstxt.org convention: one markdown file at the root that names what
 * exists and links to it, so a model answering "who is this person, what have
 * they built" reads a curated index instead of guessing from whichever page it
 * happened to crawl. For a portfolio that is the whole game — the questions
 * being asked about this site are about a person, and the answer should not
 * depend on which URL the crawler landed on.
 *
 * Generated, not hand-maintained, so it cannot describe a project that has been
 * removed or miss one that has been added.
 */
export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();

  const lines = [
    `# ${SITE.name}`,
    '',
    `> ${SITE.role} in ${SITE.location.city}, ${SITE.location.country}. ${SITE.yearsExperience} years of production work, mostly React, Next.js, Node and PostgreSQL.`,
    '',
    'Every figure quoted on this site is measured. Case studies with no measured',
    'outcome say so rather than estimating one.',
    '',
    ...(AVAILABILITY.open ? [`Currently: ${AVAILABILITY.label}.`, ''] : []),
    '## Case studies',
    '',
    ...PROJECTS.map((project) => {
      const impact = project.impact ? ` ${project.impact}` : '';
      return `- [${project.name}](${absoluteUrl(`/work/${project.slug}/`)}): ${project.context}, ${project.year}. ${project.summary}${impact}`;
    }),
    '',
  ];

  if (posts.length > 0) {
    lines.push(
      '## Writing',
      '',
      // The `.md` alternates rather than the HTML pages: same content, no markup
      // to strip, and the frontmatter carries the canonical URL.
      ...posts.map(
        (post) =>
          `- [${post.data.title}](${absoluteUrl(`/blog/${post.id}.md`)}): ${post.data.description}`,
      ),
      '',
    );
  }

  lines.push(
    '## Elsewhere',
    '',
    `- [Portfolio](${SITE.url}/): full profile, experience and stack`,
    ...(posts.length > 0 ? [`- [Writing index](${absoluteUrl('/blog/')})`] : []),
    ...(SOCIALS.github ? [`- [GitHub](${SOCIALS.github})`] : []),
    ...(SOCIALS.linkedin ? [`- [LinkedIn](${SOCIALS.linkedin})`] : []),
    `- [Email](mailto:${SITE.email})`,
    `- [RSS](${absoluteUrl('/rss.xml')})`,
    '',
  );

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
