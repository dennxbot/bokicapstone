import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: '.',
  base: './',
  build: {
    outDir: 'dist-kiosk',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index-kiosk.html'),
      },
    },
  },
  server: {
    port: 5174, // Different port for kiosk development
  },
  define: {
    'process.env.VITE_KIOSK_MODE': JSON.stringify('true'),
  },
})