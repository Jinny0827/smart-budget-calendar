import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
      react(),
      VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
          manifest: {
              name: 'Smart Budget Calendar',
              short_name: '스마트가계부',
              description: '일정과 지출을 연동한 지능형 가계부',
              theme_color: '#3b82f6',
              background_color: '#ffffff',
              display: 'standalone',
              start_url: '/',
              icons: [
                  {
                      src: 'icon-192.png',
                      sizes: '192x192',
                      type: 'image/png',
                  },
                  {
                      src: 'icon-512.png',
                      sizes: '512x512',
                      type: 'image/png',
                      purpose: 'any maskable',
                  },
              ],
          },
          workbox : {
              globPatterns : ['**/*.{js,css,html,ico,png,svg,woff2}'],
              runtimeCaching: [
                  {
                      urlPattern: /^https:\/\/api\.budget\.bowling-manager\.com\/api\/.*/i,
                      handler: 'NetworkFirst',
                      options: {
                          cacheName: 'api-cache',
                          expiration: {
                              maxEntries: 50,
                              maxAgeSeconds: 60 * 60 * 24,
                          },
                      },
                  },
              ],
          },

      }),
  ],
})
