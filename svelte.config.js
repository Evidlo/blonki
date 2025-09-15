import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/kit/adapter-static';

export default {
  // Consult https://svelte.dev/docs#compile-time-svelte-preprocess
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({
      // The adapter will output to the `build` directory by default.
      // You can specify an output directory if you want to.
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
    }),
    paths: {
      // Set the base path to the subdirectory.
      base: '/blonki',
    },
  },
};