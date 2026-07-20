import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Transparently proxy all API calls to the Spring Boot backend.
      // This eliminates CORS entirely in local dev — no preflight needed,
      // and HttpOnly cookies are sent same-origin.
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})

