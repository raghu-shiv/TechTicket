import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],

  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    setupFiles: ['./test/setup.ts'],
    environment: 'node',

    // E2E suites create real Nest applications and use shared
    // PostgreSQL, Redis, BullMQ and Socket.IO infrastructure.
    // Run test files sequentially to prevent resource contention
    // between independent application lifecycles.
    fileParallelism: false,

    sequence: {
      concurrent: false,
    },
  },
});
