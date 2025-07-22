import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  server: {
    port: 3006,
    host: true,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
})
