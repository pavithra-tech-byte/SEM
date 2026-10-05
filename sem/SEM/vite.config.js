import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import compression from 'vite-plugin-compression';

export default defineConfig({
    plugins: [
        react({
            // Enable Fast Refresh for better dev experience
            fastRefresh: true,
            // Optimize babel for production
            babel: {
                compact: true,
            }
        }),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
            manifest: {
                name: 'SEM Student Event Manager',
                short_name: 'SEM',
                description: 'Offline-first event management for students',
                theme_color: '#4f46e5',
                background_color: '#ffffff',
                display: 'standalone',
                orientation: 'portrait',
                scope: '/',
                start_url: '/',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}'],
                // Increase cache size for better offline support
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        // Cache CDN resources (like Tesseract)
                        urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'cdn-cache',
                            expiration: {
                                maxEntries: 20,
                                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                            }
                        }
                    }
                ]
            }
        }),
        compression({
            verbose: false,
            disable: false,
            threshold: 10240,
            algorithm: 'gzip',
            ext: '.gz',
        }),
    ],
    build: {
        // Optimize chunk size
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                // Manual chunk splitting for better caching
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'ui-vendor': ['framer-motion', 'lucide-react'],
                    'db-vendor': ['dexie', 'dexie-react-hooks'],
                    'utils': ['date-fns', 'papaparse', 'zustand']
                }
            }
        },
        // Enable minification using esbuild (built into Vite, 10-20x faster than terser)
        minify: 'esbuild',
        esbuildOptions: {
            drop: ['debugger'],
            // Drop console.log but keep console.error/warn for production debugging
            pure: ['console.log']
        },
        // Source maps for debugging (disable in production for smaller bundle)
        sourcemap: false
    },
    server: {
        port: 3000,
        open: true,
        // Enable compression
        compress: true
    },
    // Optimize dependencies
    optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom', 'dexie', 'framer-motion']
    }
});
