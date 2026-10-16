import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'textures/tile_blue.png',
        'textures/tile_yellow.png',
        'textures/tile_red.png',
        'textures/tile_black.png',
        'textures/tile_teal.png',
        'textures/tile_first_player.png',
        'textures/factory_coaster.png',
        'textures/courtyard_limestone.png',
      ],
      manifest: {
        name: 'Azul: Royal Palace of Évora 3D',
        short_name: 'Azul 3D',
        description: '3D Tactile Portuguese Ceramic Tile-Drafting Game',
        theme_color: '#0B2545',
        background_color: '#0B2545',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'textures/tile_blue.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          'three-core': ['three'],
          'net-vendor': ['peerjs', 'qrcode.react', 'canvas-confetti'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
