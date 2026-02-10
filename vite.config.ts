import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
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
            name: 'Focus Reader',
            short_name: 'Focus Reader',
            description: 'Local-first RSVP + Bionic speed reading with themes and robust imports.',
            theme_color: '#0f0f10',
            background_color: '#0f0f10',
            display: 'standalone',
            icons: [
              {
                src: '/pwa-icon.svg',
                sizes: '512x512',
                type: 'image/svg+xml',
              },
              {
                src: '/pwa-maskable.svg',
                sizes: '512x512',
                type: 'image/svg+xml',
                purpose: 'maskable',
              },
            ],
          },
          workbox: {
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
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
