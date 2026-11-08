import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: [
      'tests/unit/**/*.test.ts',
      'tests/unit/**/*.test.tsx',
      // The corpus check (tests/corpus) renders every real module, in both tracks
      // and every language. It is slower than a unit test and it is the only
      // thing that can catch a transform that works on a fixture and fails on
      // the content.
      'tests/corpus/**/*.test.ts',
    ],
    // The corpus renders and the search index read the whole course, which grows
    // with every module written. After the For Everyone versions (M77, M78) three
    // of them passed on a PR and timed out at the 5 s default on the next run of
    // the same code, so the ceiling is a deliberate 30 s: a hang still fails.
    testTimeout: 30_000,
  },
})
