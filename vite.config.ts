
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Set base path to /StrataPlayer/ for production (GitHub Pages), root for dev
  base: mode === 'production' ? '/StrataPlayer/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  }
}));
