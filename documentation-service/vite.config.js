import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  },
  server: {
    port: 3007,
    host: true,
    open: true
  },
  preview: {
    port: 4173,
    host: true
  }
})
