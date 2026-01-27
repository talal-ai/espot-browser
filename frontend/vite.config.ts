import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1600,
  },
  optimizeDeps: {
    include: [
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-dialog',
      '@radix-ui/react-slot',
      '@radix-ui/react-primitive'
    ],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.json', '.ts', '.tsx'],
  },
  server: {
    port: 5173,
    strictPort: true,
    open: false,
    hmr: {
      overlay: true, // Show errors in overlay instead of full reload
    },
    watch: {
      // Reduce file watching aggressiveness
      usePolling: false,
    },
  },
});
