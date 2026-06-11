// @ts-check
import { defineConfig } from 'astro/config';

import solidJs from '@astrojs/solid-js';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  integrations: [solidJs(), sitemap()],

  vite: {
    plugins: [tailwindcss()],
    // Pre-bundle the tournament island's runtime deps at server start.
    // Pages without a Solid island (e.g. /browse) never load these, so
    // navigating to / would otherwise trigger a mid-session re-optimize
    // that aborts in-flight chunk requests (Vite "504 Outdated Optimize
    // Dep") and breaks the view transition.
    optimizeDeps: {
      include: [
        'solid-js',
        'solid-js/web',
        'solid-js/store',
        'solid-js/h',
        'solid-js/html',
        '@astrojs/solid-js/client.js',
        'canvas-confetti',
        'aria-query',
        'axobject-query'
      ]
    }
  }
});
