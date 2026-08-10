import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the build drops cleanly into any Wavespace/webspace folder.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: true,
    port: 5173,
  },
})
