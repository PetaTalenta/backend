import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 3010,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
