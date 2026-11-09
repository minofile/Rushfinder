import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/motion-studio-web/',
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: '../motion-studio-web',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2020'
  }
});
