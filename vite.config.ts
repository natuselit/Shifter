import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import packageJson from './package.json';

const buildEnv =
  (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

const sourceDateEpoch = Number(buildEnv.SOURCE_DATE_EPOCH);
const appUpdatedAt =
  buildEnv.APP_UPDATED_AT ??
  (Number.isFinite(sourceDateEpoch) && sourceDateEpoch > 0
    ? new Date(sourceDateEpoch * 1000).toISOString()
    : new Date().toISOString());

export default defineConfig({
  base: '/Shifter/',
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __APP_UPDATED_AT__: JSON.stringify(appUpdatedAt)
  },
  build: {
    chunkSizeWarningLimit: 180
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Shifter',
        short_name: 'Shifter',
        description: 'Облік змін і зарплати',
        start_url: '/Shifter/#/',
        scope: '/Shifter/',
        display: 'standalone',
        background_color: '#050506',
        theme_color: '#ffbf47',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,png,ico,json}'],
        navigateFallback: 'index.html',
        skipWaiting: true
      }
    })
  ],
  test: {
    environment: 'node'
  }
});
