import { defineConfig } from 'vite';
export default defineConfig({
  root: 'views',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
});
