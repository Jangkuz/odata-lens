import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/odata-lens/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
