import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Built into the served subfolder of the static site (committed + served at
// nivaastays.com/pondicherry-itinerary/). Reuses the same-origin /api/plan + /data.
export default defineConfig({
  base: '/pondicherry-itinerary/',
  plugins: [react()],
  build: {
    outDir: '../pondicherry-itinerary',
    emptyOutDir: true,
  },
  // dev only: proxy data + AI to production so `npm run dev` is fully functional
  server: {
    proxy: {
      '/data': { target: 'https://nivaastays.com', changeOrigin: true },
      '/api': { target: 'https://nivaastays.com', changeOrigin: true },
    },
  },
  // Unit tests: pure logic runs in Node; component files opt into jsdom per-file.
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
