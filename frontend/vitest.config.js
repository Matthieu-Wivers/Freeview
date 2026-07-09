import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],

      all: true,

      include: [
        'src/services/apiClient.js',
        'src/services/freeviewApi.js',

        'src/utils/pgn.js',
        'src/utils/sharedReview.js',

        'src/components/Analyse/AccuracySummary.jsx',
        'src/components/community/ChessPreview.jsx',
        'src/components/community/SharedGameCard.jsx',
      ],

      exclude: [
        'src/**/*.test.js',
        'src/**/*.test.jsx',
        'src/**/__tests__/**',
        'src/tests/**',
        'src/main.jsx',
      ],

      thresholds: {
        statements: 75,
        branches: 65,
        functions: 75,
        lines: 75,
      },
    },
  },
});