import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Standalone admin analytics SPA. Built into the served subfolder
// nivaastays.com/admin-analytics/ — completely separate from the landing pages
// (its hashed assets live under /admin-analytics/assets and are never referenced
// by the public site; cache-bust / inline-css / sitemap / sw all ignore it).
export default defineConfig({
  base: '/admin-analytics/',
  plugins: [react()],
  build: {
    outDir: '../admin-analytics',
    emptyOutDir: true,
  },
  // dev only: proxy the shared auth helper to production so `npm run dev` can sign in
  server: {
    proxy: {
      '/js': { target: 'https://nivaastays.com', changeOrigin: true },
    },
  },
});
