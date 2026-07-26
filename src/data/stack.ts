/**
 * Tools grouped by what they are *for*, not by vendor. Source: CV.
 *
 * Rendered as mono text rather than a wall of pills — the previous build shipped
 * ~25 identical rounded-full tags across three components, which gave a
 * four-year specialism and a one-off tool the same visual weight.
 *
 * Per-role and per-project stacks elsewhere carry the context; this list exists
 * so a keyword scan finds everything in one place.
 */

export interface StackGroup {
  label: string;
  items: string[];
}

export const STACK: StackGroup[] = [
  {
    label: 'Frontend',
    items: [
      'React 18+',
      'Next.js (App Router)',
      'TypeScript',
      'React Server Components',
      'React Native',
      'Redux',
      'Zustand',
      'SWR',
    ],
  },
  {
    label: 'Backend & APIs',
    items: ['Node.js', 'GraphQL (Apollo)', 'REST', 'PostgreSQL', 'Data modeling', 'WebSockets'],
  },
  {
    label: 'Design systems',
    items: ['Tailwind CSS', 'Material UI', 'styled-components', 'Storybook', 'Component libraries'],
  },
  {
    label: 'Performance',
    items: ['Lighthouse optimisation', 'Caching strategies', 'SSR / CSR trade-offs'],
  },
  {
    label: 'Testing',
    items: ['Jest', 'React Testing Library', 'Cypress'],
  },
  {
    label: 'Tooling',
    items: ['Git', 'CI/CD (Vercel, GitHub Actions)', 'Webpack', 'Monorepos'],
  },
];
