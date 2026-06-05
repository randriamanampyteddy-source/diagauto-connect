import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Port 3001 — Espace Administrateur
// Utilise index.html (qui charge main-admin.jsx)
export default defineConfig({
  plugins: [react()],
  publicDir: 'public-admin',
  server: {
    port: 3001,
    proxy: { '/api': 'http://localhost:5000' }
  },
  build: { outDir: 'dist-admin' }
})
