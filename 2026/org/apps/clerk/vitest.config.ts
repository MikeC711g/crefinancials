// import { defineConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';
import viteTsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [ angular(), viteTsConfigPaths() ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['**/*.spec.ts'],
    reporters: ['default', 'html'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        'src/test-utils/**',
        'src/environments/**',
        '**/*.spec.ts']
    }
  }
});
