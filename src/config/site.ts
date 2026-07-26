/**
 * Single source of truth for identity, SEO defaults and outbound links.
 *
 * Changing the domain, adding a social profile or updating the elevator pitch
 * happens here and nowhere else — `astro.config.ts`, the SEO head, the JSON-LD
 * Person schema, the RSS feed and every link in the UI all read from this file.
 *
 * Anything not yet confirmed is `null` rather than a plausible-looking guess.
 * Components skip null entries, so an unverified link can never ship broken.
 */

export const SITE = {
  /** Canonical origin. No trailing slash. Drives canonical URLs + sitemap. */
  url: 'https://cabrialesdev.netlify.app',

  name: 'Manuel Cabriales Toledo',
  /** Used where the full name does not fit: nav wordmark, OG author byline. */
  shortName: 'Manuel Cabriales',
  role: 'Senior Full Stack Engineer',

  /** Default <meta description>. Pages override; the blog derives per-post. */
  description:
    'Senior full stack engineer building production React, Next.js and Node applications. Based in Montevideo, Uruguay.',

  locale: 'en',
  /** IANA zone — powers the "hours overlap" signal for remote roles. */
  timeZone: 'America/Montevideo',
  location: {
    city: 'Montevideo',
    country: 'Uruguay',
    /** ISO 3166-1 alpha-2, for schema.org PostalAddress. */
    countryCode: 'UY',
  },

  email: 'mact200590@gmail.com',

  /**
   * Stated on the CV. Declared rather than computed from the role list, which
   * only reaches back to 2018 and would render 8 — the CV counts earlier work
   * that the listed roles don't cover.
   */
  yearsExperience: 9,
} as const;

/** Top-level destinations. Order is the order they render in the nav. */
export const NAV = [
  { label: 'Work', href: '/#work' },
  { label: 'Writing', href: '/blog/' },
  { label: 'Stack', href: '/#stack' },
] as const;

/**
 * Outbound profiles. `null` = not yet confirmed; the UI omits those entirely.
 *
 * The previous build shipped bare `https://linkedin.com` / `https://github.com`
 * hrefs, so every recruiter who clicked landed on a logged-out homepage. Typing
 * these as nullable makes that failure mode unrepresentable.
 */
export const SOCIALS = {
  github: 'https://github.com/alejandrocabriales',
  linkedin: 'https://linkedin.com/in/manuel-alejandro-cabriales-toledo',
  x: null,
} as const satisfies Record<string, string | null>;

/**
 * Availability drives the hero status line and the contact block. Set `open`
 * to false between searches rather than deleting the component.
 */
export const AVAILABILITY = {
  open: true,
  /** One short clause. Shown next to a live status dot. */
  label: 'Open to senior frontend and full-stack roles',
} as const;

export type Site = typeof SITE;
export type SocialKey = keyof typeof SOCIALS;
