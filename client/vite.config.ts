import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // In dev, /api is proxied to the Express server so no CORS setup is needed
    proxy: {
      '/api': process.env.VITE_DEV_API_PROXY ?? 'http://localhost:5000',
    },
  },
})
