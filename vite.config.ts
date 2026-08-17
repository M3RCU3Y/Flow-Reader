import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // GitHub Pages hosts under /<repo>/, so production builds need a base path.
  // Keep dev as '/' so `npm run dev` works normally.
  const base = mode === 'production' ? '/Flow-Reader/' : '/';

  return {
    base,
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['pwa-icon.svg', 'pwa-maskable.svg'],
        manifest: {
          name: 'Flow Reader',
          short_name: 'Flow Reader',
          description: 'Local-first RSVP + Bionic speed reading with TXT, PDF, DOCX, and URL imports.',
          theme_color: '#0b0b0d',
          background_color: '#0b0b0d',
          display: 'standalone',
          icons: [
            {
              // No leading slash so this works under a GitHub Pages base path.
              src: 'pwa-icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
            },
            {
              src: 'pwa-maskable.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.origin === 'https://cdn.tailwindcss.com',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'cdn-tailwind',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
            {
              urlPattern: ({ url }) =>
                url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts',
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ url }) => url.origin === 'https://cdnjs.cloudflare.com',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'cdnjs',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ url }) => url.origin === 'https://cdn.jsdelivr.net',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'jsdelivr',
                expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
    test: {
      environment: 'node',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  };
});
