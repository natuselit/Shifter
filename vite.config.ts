import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/Shifter/',
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
        theme_color: '#45d19e',
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
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,webmanifest}'],
        navigateFallback: 'index.html'
      }
    })
  ],
  test: {
    environment: 'node'
  }
});
