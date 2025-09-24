import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  },
  server: {
    port: 80, // run on port 80 inside container to match Cloudflare ingress
    host: true,
    open: false,
    allowedHosts: ['docs.futureguide.id', 'localhost', '127.0.0.1']
  },
  preview: {
    port: 4173,
    host: true
  }
})
