import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import { resolve } from 'path';

export default defineConfig({
  envDir: resolve(__dirname),
  plugins: [
    react(),
    legacy({
      targets: ['chrome >= 60', 'edge >= 79', 'firefox >= 60', 'safari >= 12'],
      modernPolyfills: true,
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    minify: 'terser',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
