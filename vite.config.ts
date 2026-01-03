import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from 'vite-plugin-pwa';


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5174,
    strictPort: true,
    // Proxy Netlify functions to the Netlify Dev server during development
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:5173',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      external: ['@supabase/supabase-js'],
      output: {
        manualChunks: {
          // Vendor chunks - separate large libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
          'query-vendor': ['@tanstack/react-query'],
          'sanity-vendor': ['@sanity/client', '@sanity/image-url'],
          // Admin components in separate chunk (lazy loaded)
          'admin': [
            './src/pages/admin/Dashboard',
            './src/pages/admin/Articles',
            './src/pages/admin/ArticleEdit',
            './src/pages/admin/ContentSection',
            './src/pages/admin/Login',
            './src/components/admin/AdminLayout',
            './src/components/admin/ProtectedRoute',
          ],
        },
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 600, // Increase limit slightly for better chunking
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'resonance-logo.svg'],
      manifest: {
        name: 'Resonance News',
        short_name: 'Resonance',
        description: 'Your trusted source for news, analysis, and stories that matter',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: '/resonance-logo.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/resonance-logo.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ],
        categories: ['news', 'magazines', 'entertainment'],
        shortcuts: [
          {
            name: 'Latest News',
            short_name: 'Latest',
            description: 'View latest articles',
            url: '/'
          },
          {
            name: 'UK News',
            short_name: 'UK',
            description: 'UK news and stories',
            url: '/uk'
          },
          {
            name: 'World News',
            short_name: 'World',
            description: 'International news',
            url: '/world'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.sanity\.io\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'sanity-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'documents',
              networkTimeoutSeconds: 10
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
}));
