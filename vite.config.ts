import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'

// base must match the repository name for GitHub Pages
export default defineConfig({
  base: '/vite-practice/',
  plugins: [solid(), tailwindcss()],
})
