import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {VitePWA} from 'vite-plugin-pwa'

export default defineConfig({
    //proxy for /api to backend
    server:{
        proxy:{
            '/api':{
                target: 'http://localhost:8000',
                changeOrigin: true,
            }
        }
    },
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'icons/*.png'],
            manifest: {
                name: 'SMUK App',
                short_name: 'SMUK',
                start_url: '/',
                display: 'standalone',
                background_color: '#ffffff',
                theme_color: '#1132d4',
                icons: [
                    {
                        src: '/icons/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: '/icons/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    },
                    {
                        src: '/icons/icon-512-maskable.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable'
                    }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg}']
            },
            devOptions: {
                enabled: true
            }
        })
    ],
})