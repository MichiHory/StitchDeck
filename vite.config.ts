import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'highlight': ['highlight.js/lib/core', 'highlight.js/lib/languages/typescript', 'highlight.js/lib/languages/php', 'highlight.js/lib/languages/yaml', 'highlight.js/lib/languages/xml', 'highlight.js/lib/languages/css', 'highlight.js/lib/languages/scss', 'highlight.js/lib/languages/less', 'highlight.js/lib/languages/json', 'highlight.js/lib/languages/javascript', 'highlight.js/lib/languages/php-template'],
          'pdf': ['pdf-lib'],
        },
      },
    },
  },
});