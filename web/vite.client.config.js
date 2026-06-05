import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Port 3000 — Espace Client uniquement
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'use-client-entry',
      transformIndexHtml(html) {
        return html.replace('main-admin.jsx', 'main-client.jsx')
      }
    },
    {
      name: 'create-client-index-alias',
      closeBundle() {
        copyFileSync(
          resolve('dist-client/index-client.html'),
          resolve('dist-client/index.html')
        )
      }
    }
  ],
  publicDir: 'public-client',
  server: {
    port: 3000,
    proxy: { '/api': 'http://localhost:5000' }
  },
  build: {
    outDir: 'dist-client',
    rollupOptions: { input: 'index-client.html' }
  }
})
