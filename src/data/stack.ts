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
    label: 'AI engineering',
    items: [
      'LLM APIs (Claude, OpenAI via OpenRouter)',
      'Agent design & orchestration',
      'Function calling / tool use',
      'Prompt design',
      'Conversational flows & task classification',
      'WhatsApp Business API',
      'Cursor',
      'Claude Code',
    ],
  },
  {
    label: 'Frontend',
    items: [
      'React 18+',
      'Next.js (App Router)',
      'React Server Components',
      'React Native',
      'Redux',
      'Zustand',
      'SWR',
      'TanStack Query',
    ],
  },
  {
    label: 'Backend & APIs',
    items: [
      'Node.js',
      'Express',
      'NestJS',
      'GraphQL (Apollo)',
      'REST API design',
      'PostgreSQL',
      'MongoDB',
      'Data modeling',
      'WebSockets',
    ],
  },
  {
    label: 'Languages',
    items: ['TypeScript', 'JavaScript (ES6+)', 'SQL', 'HTML5', 'CSS3'],
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
    items: ['Git', 'CI/CD (Vercel, GitHub Actions)', 'Docker', 'Webpack', 'Monorepos'],
  },
];
