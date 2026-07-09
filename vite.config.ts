import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react') || id.includes('scheduler')) return 'react'
          if (id.includes('pdfjs-dist')) return 'pdfjs'
          if (id.includes('pdf-lib')) return 'pdf-lib'
          if (id.includes('fabric')) return 'canvas'
          return 'vendor'
        },
      },
    },
  },
})
