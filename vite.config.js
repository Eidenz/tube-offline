import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/videos': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/thumbnails': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/subtitles': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: {
    port: 5000,
    https: false, // Explicitly disable HTTPS
  },
  build: {
    // Ensure assets use relative paths
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
})