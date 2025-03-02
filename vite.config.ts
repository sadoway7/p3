import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      // Proxy all /api requests to the backend
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: ['l2.sadoway.ca', 'rumfor.com'],
    proxy: {
      // Correct proxy for preview mode
      '/api': {
        target: '/api', // Corrected: Use relative path
        changeOrigin: true,
        secure: false,
        // No rewrite needed
      }
    }
  },
})
