/**
 * Work history, newest first. Source of truth: CV (CV-Manuel-FullStack.pdf).
 *
 * `highlights` carry outcomes, not tool lists — every figure here comes from the
 * CV verbatim. Nothing is estimated or rounded up. If a bullet has no number, it
 * earns its place by naming scope instead.
 */

export interface Role {
  company: string;
  url: string | null;
  position: string;
  /** Where the work happened, incl. remote status — a hiring signal by itself. */
  location: string;
  /** ISO dates. `end: null` means current. */
  start: string;
  end: string | null;
  summary: string;
  highlights: { label: string; detail: string }[];
  stack: string[];
}

export const EXPERIENCE: Role[] = [
  {
    company: 'DSpot',
    url: null,
    position: 'Senior Full Stack Engineer',
    location: 'Montevideo, Uruguay — Remote',
    start: '2021-12',
    end: null,
    summary:
      'Frontend architecture for financial products, plus the design system and internal tooling the rest of the team builds on.',
    highlights: [
      {
        label: 'Investment platform (Fusion)',
        detail:
          'Led frontend architecture on Next.js App Router. Tuned the SSR/client rendering split and improved First Contentful Paint by 40%.',
      },
      {
        label: 'Design system',
        detail:
          'Architected and maintained the Powerhouse Design System in TypeScript and Tailwind — documented, reusable components that raised team development velocity by 30%.',
      },
      {
        label: 'Document processing suite',
        detail:
          'Built the UI for a platform that turns unstructured PDF and Word files into structured, queryable data, working directly against the backend extraction APIs.',
      },
      {
        label: 'Data fetching and caching',
        detail:
          'Implemented SWR revalidation and caching strategies that keep the UI responsive against high-latency financial and third-party APIs.',
      },
      {
        label: 'Evaluation platform',
        detail:
          'Built the frontend for an internal QA and evaluation framework, including visualisation of assessment results and human-readable reporting.',
      },
    ],
    stack: ['Next.js', 'React', 'TypeScript', 'SWR', 'Tailwind CSS', 'Material UI', 'Storybook'],
  },
  {
    company: 'Fulltime',
    url: null,
    position: 'Software Developer',
    location: 'Montevideo, Uruguay',
    start: '2019-11',
    end: '2021-09',
    summary:
      'Production React Native applications for industrial clients, backed by GraphQL services in Node.',
    highlights: [
      {
        label: 'Industrial mobile apps',
        detail:
          'Shipped cross-platform apps handling real-time inventory, logistics tracking and offline-capable data flows.',
      },
      {
        label: 'GraphQL API design',
        detail:
          'Designed and optimised schemas and resolvers in Node.js, cutting API payload sizes by 50% and measurably improving mobile responsiveness.',
      },
      {
        label: 'Form architecture',
        detail:
          'Standardised complex multi-step forms on React Hook Form, consolidating validation logic and reducing recurring bugs.',
      },
    ],
    stack: ['React Native', 'GraphQL', 'Apollo', 'Node.js', 'React Hook Form'],
  },
  {
    company: 'E-planning',
    url: null,
    position: 'AdTech Developer',
    location: 'Montevideo, Uruguay',
    start: '2018-08',
    end: '2019-11',
    summary:
      'Rich-media advertising components and real-time bidding integration for major advertising clients.',
    highlights: [
      {
        label: 'Rich media',
        detail:
          'Built dynamic, high-impact ad components in vanilla JavaScript with heavy DOM manipulation.',
      },
      {
        label: 'Header bidding',
        detail:
          'Integrated Prebid.js real-time bidding, increasing auction competitiveness and client ad revenue.',
      },
    ],
    stack: ['JavaScript', 'Prebid.js', 'DOM APIs'],
  },
];

export const EDUCATION = {
  degree: 'BSc Computer Science',
  institution: 'Central University «Marta Abreu» of Las Villas',
  location: 'Cuba',
  start: '2010',
  end: '2014',
} as const;

export const LANGUAGES = [
  { name: 'Spanish', level: 'Native' },
  {
    name: 'English',
    level: 'Professional working proficiency — technical and business communication',
  },
] as const;
