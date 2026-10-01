import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: { main: resolve(__dirname, 'index.html'), thumb: resolve(__dirname, 'thumb.html') },
      output: { manualChunks: (id: string) => (id.includes('node_modules/three/') ? 'three' : undefined) },
    },
    chunkSizeWarningLimit: 800,
  },
});
