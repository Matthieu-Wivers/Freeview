import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup/env.js'],
    include: ['src/__tests__/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'src/services/**/*.js',
        'src/middlewares/**/*.js',
        'src/utils/**/*.js',
      ],
      exclude: [
        'src/**/*.test.js',
        'src/__tests__/**',
        'src/utils/env.utils.js',
        'src/services/stockfish.service.js',
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
  },
});
