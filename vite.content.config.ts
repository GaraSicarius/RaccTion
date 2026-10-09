import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// Builds the content script as a single self-contained IIFE (no React, no code
// splitting, no imports left in the output).
export default defineConfig({
  base: './',
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: fileURLToPath(new URL('./src/content/index.ts', import.meta.url)),
      output: {
        format: 'iife',
        entryFileNames: 'content.js',
        inlineDynamicImports: true,
      },
    },
  },
});
