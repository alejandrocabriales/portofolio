import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

import { SITE } from './src/config/site';

// https://astro.build/config
export default defineConfig({
  /**
   * Required for canonical URLs, the sitemap and absolute OG image paths.
   * Read from `src/config/site.ts` so the domain is declared exactly once.
   */
  site: SITE.url,

  /**
   * Opt-in prefetching. Links marked `data-astro-prefetch` warm on hover, so
   * navigation feels instant without speculatively downloading every route.
   */
  prefetch: true,

  integrations: [mdx(), sitemap()],

  markdown: {
    shikiConfig: {
      /**
       * Dual themes emit `--shiki-light` / `--shiki-dark` custom properties on
       * every token, so switching is a CSS concern — no second highlight pass,
       * no re-render, and no JS. Vitesse is warm-toned, which sits with the
       * amber anchor instead of fighting it.
       */
      themes: {
        light: 'vitesse-light',
        dark: 'vitesse-dark',
      },
      /** Long lines wrap rather than forcing a horizontal scrollbar on mobile. */
      wrap: true,
    },
  },

  /**
   * Tailwind v4 ships as a Vite plugin — `@astrojs/tailwind` is deprecated in
   * Astro 5. Design tokens live in the stylesheet's `@theme` block rather than
   * a separate JS config, which keeps colour and type in one place.
   */
  vite: {
    plugins: [tailwindcss()],
  },
});
