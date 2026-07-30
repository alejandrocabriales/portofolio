/**
 * Selected work. Source of truth: CV, plus two shipped products the CV omits
 * (MIPS Portal) that are worth keeping because they are publicly linkable.
 *
 * `impact` holds only figures the CV states. Where there is no measured number
 * the field stays null and the UI renders nothing — a case study with a real
 * number beats one with an invented number, and an empty field beats both.
 */

export interface Project {
  slug: string;
  name: string;
  /** Who it was built for — the credibility signal recruiters actually read. */
  context: string;
  year: string;
  /** One line for the index row. */
  summary: string;
  /** What was hard about the domain, not what the app does. */
  problem: string;
  /** First person, specific. What *you* owned, not what the team shipped. */
  contribution: string;
  /** Real, sourced metric only. Null renders nothing. */
  impact: string | null;
  stack: string[];
  url: string | null;
  repo: string | null;
  featured: boolean;
}

export const PROJECTS: Project[] = [
  {
    slug: 'fusion',
    name: 'Fusion',
    context: 'Sky (formerly MakerDAO)',
    year: '2023',
    summary:
      'Business-intelligence dashboard for the Sky ecosystem — finances, governance and contributors in one view.',
    problem:
      'The numbers that describe Sky lived in three unrelated places: budgets and spend reported per core unit, executive votes recorded on-chain, and contributor status tracked by hand. Answering a basic question about the ecosystem meant assembling it yourself. The financial views also read from external APIs slow enough that naive rendering felt broken.',
    contribution:
      'Led the frontend architecture on Next.js App Router — deciding what rendered on the server versus the client, and implementing the SWR revalidation and caching layer that absorbs upstream latency. Built the finance breakdown (revenue, protocol and operating costs across Governance, Stability, Outreach and the other core units), the executive-proposal tracker with vote and execution dates plus MKR support, and the directory of ecosystem actors with their current status.',
    impact: 'First Contentful Paint improved by 40%.',
    stack: ['Next.js', 'React', 'TypeScript', 'WebSockets', 'SWR', 'Material UI'],
    url: 'https://fusion-nine-eta.vercel.app/',
    repo: null,
    featured: true,
  },
  {
    slug: 'achra',
    name: 'Achra',
    context: 'DSpot',
    year: '2026',
    summary:
      'Marketplace and operations layer for global coordination — organisations post roadmaps, builder teams bid on them, operators run the back office.',
    problem:
      'Distributed organisations can find teams, but they cannot run them. Scope lives in one tool, approvals in another, and payment in a third — and once the parties sit in different countries, invoicing, tax reporting and compliance become the reason work stops. The product had to make one flow out of RFP, proposal, delivery and payment, and keep every decision along it auditable.',
    contribution:
      'Built the three-sided product surface — organisation roadmaps and structured proposals, project discovery for builders, and the operator service catalogue — on Next.js and TypeScript. Implemented the operational hub (invoicing, milestone payouts, reporting, 1099/W-9 tax paperwork), the governance layer that encodes rules, permissions and approvals as a traceable record, and the stablecoin milestone-payment flow against Node and Postgres services. Structured the data and workflow models so AI agents participate as first-class actors rather than bolted-on automation.',
    impact: null,
    stack: [
      'Next.js',
      'React',
      'TypeScript',
      'Tailwind CSS',
      'viem',
      'wagmi',
      'Node.js',
      'PostgreSQL',
    ],
    url: 'https://achra.com/',
    repo: null,
    featured: true,
  },
  {
    slug: 'powerhouse-design-system',
    name: 'Powerhouse Design System',
    context: 'DSpot',
    year: '2023',
    summary: 'Component library and design system for teams handling dense structured data.',
    problem:
      'Several product teams were rebuilding the same components with different accessibility and data-handling behaviour, so every fix had to be made more than once.',
    contribution:
      'Architected and maintained the system in TypeScript and Tailwind, documented in Storybook, with accessibility and large structured-data rendering as first-class requirements rather than afterthoughts.',
    impact: 'Team development velocity increased by 30%.',
    stack: ['TypeScript', 'React', 'Tailwind CSS', 'Storybook'],
    url: 'https://powerhouse-design-system.vercel.app/',
    repo: null,
    featured: true,
  },
  {
    slug: 'mips-portal',
    name: 'MIPS Portal',
    context: 'MakerDAO',
    year: '2022',
    summary: 'Governance portal for reading and tracking MakerDAO Improvement Proposals.',
    problem:
      'Governance proposals lived as markdown across repositories, which made them effectively unreadable to the people expected to vote on them.',
    contribution:
      'Built the reading and tracking interface in React and TypeScript, including proposal navigation and state management for a large, deeply nested document set.',
    impact: null,
    stack: ['React', 'TypeScript', 'Redux', 'styled-components'],
    url: 'https://mips.makerdao.com/mips/list',
    repo: null,
    featured: true,
  },
  {
    slug: 'industrial-mobile-suite',
    name: 'Industrial Mobile Suite',
    context: 'Fulltime',
    year: '2020',
    summary: 'Cross-platform React Native apps for inventory management and logistics.',
    problem:
      'Warehouse and logistics staff work where connectivity drops. The apps had to keep functioning offline and reconcile cleanly once the network returned.',
    contribution:
      'Shipped the production apps end to end — real-time inventory, logistics tracking and offline-capable data flows — against GraphQL services I also designed in Node.',
    impact: 'GraphQL payload sizes reduced by 50%.',
    stack: ['React Native', 'GraphQL', 'Apollo', 'Node.js'],
    url: null,
    repo: null,
    featured: false,
  },
];
