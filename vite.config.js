import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import { execSync } from 'node:child_process';

let commit = 'dev';
try { commit = execSync('git rev-parse --short HEAD', { cwd: __dirname }).toString().trim(); } catch {}
const BUILD_VERSION = `${new Date().toISOString()}-${commit}`;

export default defineConfig({
  define: {
    __BUILD_VERSION__: JSON.stringify(BUILD_VERSION),
  },
  plugins: [
    vue(),
    {
      name: 'amoevents-version-json',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ version: BUILD_VERSION }),
        });
      },
    },
    VitePWA({
      // autoUpdate + skipWaiting: a new deploy takes over on the next
      // navigation instead of waiting for every tab to close first. Fixes
      // the "user still sees old UI after we deployed" caching problem.
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // The app shell must be available after a refresh with no signal.
        // Guest/event data is stored separately in IndexedDB; these files
        // only make the Vue application itself boot offline.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/assets\/.*\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'route-chunks', expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 3600 } },
          },
          {
            urlPattern: /\.(?:woff2?|ttf)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 3600 } },
          },
          {
            // The local background-removal model is large, so it is not
            // part of the small app-shell precache. Cache it after its
            // first successful online use; subsequent removals work
            // completely offline.
            urlPattern: /\.(?:wasm|onnx|data)(?:\?.*)?$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'studio-local-ai',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 12, maxAgeSeconds: 365 * 24 * 3600 },
            },
          },
          {
            // IMG.LY splits its model into extensionless hash-named chunks
            // and consults resources.json on every load. Cache that complete
            // resource set after first use, not only files ending in .onnx.
            urlPattern: /^https:\/\/staticimgly\.com\/@imgly\/background-removal-data\/.*$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'studio-background-removal-model',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 100, maxAgeSeconds: 365 * 24 * 3600 },
            },
          },
          {
            // Event covers, signed uploaded cards, QR artwork, and variant
            // images remain available after they have been viewed online.
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'event-images',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 600, maxAgeSeconds: 30 * 24 * 3600 },
            },
          },
        ],
      },
      includeAssets: ['icon-192.png', 'icon-512.png', 'icon-512-maskable.png', 'apple-touch-icon.png', 'favicon-32.png', 'favicon-16.png', 'logo.png'],
      manifest: {
        name: 'Amo Events — Event Management',
        short_name: 'Amo Events',
        description: 'Digital invitations & guest management — events.amoview.com',
        theme_color: '#C06FEF',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/app',
        icons: [
          { src: '/icon-192.png',         sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png',         sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-512-maskable.png',sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(process.cwd(), 'src') },
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/files': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
