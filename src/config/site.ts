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
  /**
   * BCP 47 form of `locale`, for `og:locale` — which wants `en_US`, not `en`.
   * Kept alongside rather than derived: the two formats disagree often enough
   * that computing one from the other invites a wrong guess.
   */
  ogLocale: 'en_US',
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

  /**
   * Social card shown when a page has no card of its own.
   *
   * 1200×675 rather than the more common 1200×630. Both clear the 1200px width
   * every platform wants, but 675 is exactly 16:9, which is the ratio Google
   * Discover treats as a large image — and Discover is the one surface here
   * where the card is the entire result. Social platforms crop the 45px
   * difference without complaint; Discover does not fill it back in.
   *
   * The file is committed rather than generated during `astro build` — see
   * `scripts/generate-og.mjs` for why (font availability differs between this
   * machine and the CI container, so a build-time render is not reproducible).
   */
  ogImage: {
    path: '/og/default.png',
    width: 1200,
    height: 675,
    alt: 'Manuel Cabriales Toledo — Senior Full Stack Engineer',
  },

  /**
   * IndexNow key. Public by design — it is verified by being served at
   * `/<key>.txt` from this host, so possession of the string proves nothing
   * without control of the domain. Rotate by generating a new hex string,
   * renaming that file and changing this value in the same commit.
   */
  indexNowKey: '5b2ff766d724b220a64f627af189982b',

  /**
   * `theme-color`, one per scheme. Hex rather than the `oklch()` the stylesheet
   * uses: browser chrome tinting has patchier colour-function support than the
   * page does, and a value it cannot parse is a value it ignores. These are the
   * sRGB conversions of `--paper` in each theme.
   */
  themeColor: {
    light: '#f9f6f2',
    dark: '#0e0a07',
  },
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
  /**
   * Note the `-027bba161` suffix. LinkedIn appends a disambiguator when the
   * name-only slug is already taken, and it is not derivable from the name —
   * the value here must be copied from the profile, never reconstructed.
   * The earlier name-only form was a reconstruction, and did not resolve.
   */
  linkedin: 'https://www.linkedin.com/in/manuel-alejandro-cabriales-toledo-027bba161',
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

/**
 * Confirmed profile URLs as a flat list, for schema.org `sameAs`.
 *
 * `sameAs` is how a search engine connects this site to the GitHub and LinkedIn
 * profiles carrying the same name — the single strongest entity signal a
 * personal site can send. Unconfirmed entries are `null` in `SOCIALS` and are
 * dropped here, so the graph never claims a profile that isn't ours.
 */
export const SAME_AS: string[] = (Object.values(SOCIALS) as (string | null)[]).filter(
  // Widened first: `as const satisfies` gives `Object.values` a union of the
  // literal URLs, and a type predicate cannot narrow a type it isn't part of.
  (href): href is string => href !== null,
);

export type Site = typeof SITE;
export type SocialKey = keyof typeof SOCIALS;
