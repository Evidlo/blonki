import { defineConfig } from '@tailwindcss/postcss'

export default defineConfig({
  content: ['./index.html', './src/**/*.{js,ts,svelte}'],
  plugins: [
    require('@tailwindcss/forms'),
  ],
})