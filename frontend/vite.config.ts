import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  }
})
