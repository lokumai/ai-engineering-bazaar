import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Index, LevelDoc, ModuleDoc, Tokens } from '@/lib/bundle/schema'

/**
 * Spec 2.13 guard 13: the published bundle, read from the export on disk, meets
 * the strict schemas of `src/lib/bundle/schema.ts`.
 *
 * Every route handler already parses its own document before it serialises
 * it, so this is the check of what happened AFTER the routes: the finaliser
 * writes `index.json` from the draft, and `check-bundle-out.mjs` can only
 * check the hashes, not the shape, because a script cannot import the schema
 * (spec 2.5). Playwright resolves the tsconfig `paths`, so the schema is
 * imported here rather than restated, and this is the one place the finished
 * export is held to it.
 *
 * It reads `out/` and opens no page: the `webServer` build is what produced
 * the files.
 */

const OUT = join(process.cwd(), 'out')

const read = (path: string): unknown => JSON.parse(readFileSync(join(OUT, path), 'utf8'))

/** The schema a listed document is parsed with, decided by where it lives. */
function schemaFor(path: string) {
  if (path.startsWith('api/v1/levels/')) return LevelDoc
  if (path.startsWith('api/v1/modules/')) return ModuleDoc
  if (path === 'api/v1/tokens.json') return Tokens
  throw new Error(`bundle.spec: no schema for the listed document ${path}`)
}

test('the bundle index and every document it lists parse with the strict schemas', () => {
  const index = Index.parse(read('api/v1/index.json'))

  const documents = Object.keys(index.files).filter((path) => path.endsWith('.json'))
  expect(documents.length, 'index.json lists no JSON document').toBeGreaterThan(0)

  for (const path of documents) {
    const parsed = schemaFor(path).safeParse(read(path))
    expect(parsed.success, `${path}: ${parsed.error?.message ?? ''}`).toBe(true)
  }
})
