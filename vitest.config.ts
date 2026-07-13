import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: [
        'src/app/shared/utils/**/*.ts',
        'src/app/features/**/utils/**/*.ts',
        'src/app/core/config/**/*.ts',
        'src/app/core/services/**/*.ts',
        'src/app/features/**/services/**/*.ts',
        'src/app/features/**/guards/**/*.ts',
      ],
      exclude: ['src/app/**/*.spec.ts', '**/*.d.ts', '**/*.model.ts'],
      thresholds: {
        statements: 95,
        branches: 88,
        functions: 95,
        lines: 95,
      },
    },
  },
});
