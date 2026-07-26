/**
 * schema.org JSON-LD, built as a single connected graph per page.
 *
 * Two decisions shape this file.
 *
 * **One `@graph`, not several `<script>` blocks.** Every page emits exactly one
 * JSON-LD document containing the `Person`, the `WebSite` and the page-specific
 * nodes. Separate blocks force a parser to guess which `Person` an `author`
 * refers to; a graph lets nodes reference each other by `@id` and say so.
 *
 * **Stable `@id`s.** `…/#person` and `…/#website` are the same identifier on
 * every page of the site, so a crawler merges the mentions into one entity
 * rather than treating each page as introducing a new one. That merge is the
 * whole point — it's what turns "some pages about a name" into "an entity".
 *
 * Nothing here asserts a fact the site doesn't already state in HTML.
 */

import { SITE, SAME_AS } from '@/config/site';
import { EDUCATION, EXPERIENCE, LANGUAGES } from '@/data/experience';
import { STACK } from '@/data/stack';
import { absoluteUrl } from '@/lib/seo';
import { readingTime, type Post } from '@/lib/posts';
import type { Project } from '@/data/projects';

/** A JSON-LD node. Loosely typed on purpose — the vocabulary is open-ended. */
export type SchemaNode = Record<string, unknown>;

export const PERSON_ID = `${SITE.url}/#person`;
export const WEBSITE_ID = `${SITE.url}/#website`;

/** Reference to another node in the same graph, rather than inlining a copy. */
const ref = (id: string) => ({ '@id': id });

/**
 * The Person node — the entity this whole site is about.
 *
 * `knowsAbout` is flattened from the Stack section rather than hand-written, so
 * the machine-readable claim and the visible list can't drift apart. `worksFor`
 * takes only the current role: listing every past employer as a present
 * relationship is the kind of overreach that gets structured data ignored.
 */
export function personNode(): SchemaNode {
  const current = EXPERIENCE.find((role) => role.end === null);
  const knowsAbout = [...new Set(STACK.flatMap((group) => group.items))];

  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: SITE.name,
    alternateName: SITE.shortName,
    url: `${SITE.url}/`,
    jobTitle: SITE.role,
    description: SITE.description,
    email: `mailto:${SITE.email}`,
    image: absoluteUrl(SITE.ogImage.path),
    sameAs: SAME_AS,
    knowsAbout,
    knowsLanguage: LANGUAGES.map((language) => language.name),
    address: {
      '@type': 'PostalAddress',
      addressLocality: SITE.location.city,
      addressCountry: SITE.location.countryCode,
    },
    alumniOf: {
      '@type': 'CollegeOrUniversity',
      name: EDUCATION.institution,
    },
    ...(current
      ? { worksFor: { '@type': 'Organization', name: current.company } }
      : {}),
  };
}

/**
 * The site itself. `publisher` points at the Person — a one-author site.
 *
 * No `SearchAction`. Site search is Pagefind running in the browser, with no
 * URL that accepts a query, so a `SearchAction` here would advertise a search
 * endpoint that does not exist. Declaring one anyway is a common way to get a
 * site's structured data distrusted wholesale.
 *
 * `copyrightHolder` and `copyrightYear` are ownership signals: they name who
 * stands behind the content, which matters more for a one-person site than for
 * a publication with a masthead.
 */
export function websiteNode(): SchemaNode {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${SITE.url}/`,
    name: SITE.name,
    description: SITE.description,
    inLanguage: SITE.locale,
    publisher: ref(PERSON_ID),
    copyrightHolder: ref(PERSON_ID),
    copyrightYear: new Date().getFullYear(),
  };
}

interface WebPageInput {
  url: string;
  title: string;
  description: string;
  /** `ProfilePage` for the index, `CollectionPage` for archives, else WebPage. */
  type?: 'WebPage' | 'ProfilePage' | 'CollectionPage' | 'AboutPage';
  image: string;
  breadcrumbId?: string | undefined;
  /** Set on the index only: the page *is* the Person's profile. */
  mainEntityId?: string | undefined;
}

/** The page node every route emits, tying the page to the site and the author. */
export function webPageNode({
  url,
  title,
  description,
  type = 'WebPage',
  image,
  breadcrumbId,
  mainEntityId,
}: WebPageInput): SchemaNode {
  return {
    '@type': type,
    '@id': `${url}#webpage`,
    url,
    name: title,
    description,
    isPartOf: ref(WEBSITE_ID),
    about: ref(PERSON_ID),
    primaryImageOfPage: { '@type': 'ImageObject', url: image },
    inLanguage: SITE.locale,
    ...(breadcrumbId ? { breadcrumb: ref(breadcrumbId) } : {}),
    ...(mainEntityId ? { mainEntity: ref(mainEntityId) } : {}),
  };
}

export interface Crumb {
  name: string;
  /** Site-relative path. Omitted on the final crumb — it is the current page. */
  path?: string | undefined;
}

/**
 * BreadcrumbList for the trail already rendered in the page's `<nav>`.
 *
 * Google uses this to replace the raw URL in a result with a readable path,
 * which is worth real click-through on deep pages like a case study.
 */
export function breadcrumbNode(pageUrl: string, crumbs: Crumb[]): SchemaNode {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#breadcrumb`,
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      ...(crumb.path ? { item: absoluteUrl(crumb.path) } : {}),
    })),
  };
}

/**
 * A published post.
 *
 * `wordCount` and `timeRequired` come from the same source as the visible
 * "N min read", so the badge and the markup agree. `dateModified` falls back to
 * `datePublished` because Google treats a missing modified date as unknown
 * rather than as "never edited", and unknown is the weaker signal.
 */
export function blogPostingNode(post: Post, url: string, image: string): SchemaNode {
  const words = (post.body ?? '').split(/\s+/).filter(Boolean).length;

  return {
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: post.data.title,
    description: post.data.description,
    url,
    datePublished: post.data.published.toISOString(),
    dateModified: (post.data.updated ?? post.data.published).toISOString(),
    author: ref(PERSON_ID),
    publisher: ref(PERSON_ID),
    mainEntityOfPage: `${url}#webpage`,
    image,
    articleSection: post.data.category,
    keywords: post.data.tags.join(', '),
    wordCount: words,
    timeRequired: `PT${readingTime(post)}M`,
    inLanguage: SITE.locale,
  };
}

/** The writing archive as a Blog, with its posts as an ordered list. */
export function blogNode(url: string, posts: Post[]): SchemaNode {
  return {
    '@type': 'Blog',
    '@id': `${url}#blog`,
    url,
    name: `Writing — ${SITE.name}`,
    description: SITE.description,
    inLanguage: SITE.locale,
    author: ref(PERSON_ID),
    publisher: ref(PERSON_ID),
    blogPost: posts.map((post) => ({
      '@type': 'BlogPosting',
      '@id': `${absoluteUrl(`/blog/${post.id}/`)}#article`,
      headline: post.data.title,
      url: absoluteUrl(`/blog/${post.id}/`),
      datePublished: post.data.published.toISOString(),
    })),
  };
}

/**
 * A case study's subject: the thing that was built, not the page describing it.
 *
 * `creator` rather than `author` — these are applications, and the role being
 * claimed is authorship of the work, which is what a recruiter is checking.
 */
export function projectNode(project: Project, url: string): SchemaNode {
  return {
    '@type': 'CreativeWork',
    '@id': `${url}#project`,
    name: project.name,
    description: project.summary,
    url,
    ...(project.url ? { sameAs: [project.url] } : {}),
    creator: ref(PERSON_ID),
    dateCreated: project.year,
    keywords: project.stack.join(', '),
    inLanguage: SITE.locale,
  };
}

/** The Selected work section, so the index itself lists the case studies. */
export function projectListNode(url: string, projects: Project[]): SchemaNode {
  return {
    '@type': 'ItemList',
    '@id': `${url}#work`,
    name: 'Selected work',
    itemListElement: projects.map((project, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: project.name,
      url: absoluteUrl(`/work/${project.slug}/`),
    })),
  };
}

/** Wrap page nodes into the document that actually ships. */
export function graph(nodes: SchemaNode[]): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [personNode(), websiteNode(), ...nodes],
  });
}
