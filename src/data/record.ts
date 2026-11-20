/**
 * Measured outcomes pinned to the flight record, keyed by the role they belong
 * to. Every figure is the CV's own; a `figure` of null renders the outcome as
 * text only, because the CV states the result without a number.
 *
 * `pending` marks a measurement that exists but is not in yet. It renders
 * dashed — state by line form — and must name when it is due, never a guess.
 */

export interface Outcome {
  /** Large figure, verbatim from the CV. Null when the CV gives no number. */
  figure: string | null;
  /** What the figure measures, in a few words. */
  caption: string;
  /** Where the full story lives. */
  href: string | null;
  pending?: boolean | undefined;
}

export const OUTCOMES: Record<string, Outcome[]> = {
  'E-planning': [
    {
      figure: null,
      caption: 'Prebid.js header bidding raised client ad revenue',
      href: null,
    },
  ],
  Fulltime: [
    {
      figure: '−50%',
      caption: 'GraphQL payload size',
      href: '/work/industrial-mobile-suite/',
    },
  ],
  DSpot: [
    {
      figure: '−40%',
      caption: 'First Contentful Paint · Fusion',
      href: '/work/fusion/',
    },
    {
      figure: '+30%',
      caption: 'Team velocity · design system',
      href: '/work/powerhouse-design-system/',
    },
  ],
  'Independent project': [
    {
      figure: '111',
      caption: 'Production failures logged, each with a cause and status',
      href: '/blog/111-failures-of-a-booking-chatbot/',
    },
    {
      figure: null,
      caption: 'Business impact · measuring through Nov 2026',
      href: null,
      pending: true,
    },
  ],
};
