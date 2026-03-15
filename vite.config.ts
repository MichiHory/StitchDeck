import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'highlight',
              test: /highlight\.js/,
            },
            {
              name: 'pdf',
              test: /pdf-lib/,
            },
          ],
        },
      },
    },
  },
});