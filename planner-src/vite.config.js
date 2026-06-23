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
  // unit tests for the pure logic modules (utils + scheduler). Node env — no DOM needed.
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
