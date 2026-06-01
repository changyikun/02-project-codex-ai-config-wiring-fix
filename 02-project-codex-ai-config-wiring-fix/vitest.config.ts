import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['server/tests/**/*.test.ts', 'src/**/*.test.ts?(x)'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
