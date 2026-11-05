import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { toBlocks } from '@/lib/bundle/blocks'
import { imageBaseFor, imagePathFor } from '@/lib/content/images'
import { renderTree } from '@/lib/content/render'

/**
 * The kitchen sink as blocks, stored beside this file (guard 2 of spec 2.13).
 *
 * The same invented module `kitchen-sink.test.ts` pins as HTML, so every
 * structure the renderer understands is pinned here as the native reader
 * receives it. A change to the converter prints a diff of what the reader
 * would get; accept it with `npx vitest -u` or fix what broke. `sizeOf` is
 * stubbed because the fixture's image does not exist.
 */

const FIXTURE = join(import.meta.dirname, '../../fixtures/kitchen-sink.md')

describe('the kitchen sink, as blocks', () => {
  it('converts to the blocks it converted to last time', async () => {
    const { tree } = await renderTree(readFileSync(FIXTURE, 'utf8'), {
      imageBase: imageBaseFor('fundamentals'),
      imagePath: imagePathFor('fundamentals'),
      sheet: 1,
    })
    const converted = toBlocks(tree, {
      module: 'fixture/kitchen-sink',
      lang: 'en',
      sizeOf: () => ({ width: 640, height: 480 }),
    })
    await expect(JSON.stringify(converted, null, 2) + '\n').toMatchFileSnapshot('./__snapshots__/kitchen-sink-blocks.json')
  })
})
