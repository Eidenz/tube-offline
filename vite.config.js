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
})