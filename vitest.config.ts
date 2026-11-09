import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    // Run once and exit, however it is started. A bare `vitest` watches
    // forever: two left behind by helpers held Prisma's engine file for 40
    // minutes and the preview could not start (Time Tracker finding 20).
    watch: false,
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    // Contract tests talk to a real database and must not race each other.
    fileParallelism: false,
  },
  resolve: {
    alias: { '@': path.resolve(process.cwd(), 'src') },
  },
});
