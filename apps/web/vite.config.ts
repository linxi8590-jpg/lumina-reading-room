import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const SERVER_TARGET = process.env.LUMINA_SERVER_URL || 'http://localhost:3000'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/health': { target: SERVER_TARGET, changeOrigin: true },
      '/mcp': { target: SERVER_TARGET, changeOrigin: true },
      '/api': { target: SERVER_TARGET, changeOrigin: true },
    },
  },
})
