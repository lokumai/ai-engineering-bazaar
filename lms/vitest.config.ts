import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: [
      'tests/unit/**/*.test.ts',
      'tests/unit/**/*.test.tsx',
      // The corpus check (tests/corpus) renders all 32 real modules. It is
      // slower than a unit test and it is the only thing that can catch a
      // transform that works on a fixture and fails on the content.
      'tests/corpus/**/*.test.ts',
    ],
  },
})
