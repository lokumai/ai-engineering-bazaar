import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { describe, expect, it } from 'vitest'
import { CATEGORY_DIRS } from '@/lib/content/categories'
import { CATEGORIES, CURRICULUM_MODULES } from '@/lib/content/curriculum-file'
import { CONTENT_ROOT } from '@/lib/content/paths'

/**
 * **TEMPORARY. Delete this file with the corpus pass.**
 *
 * For one commit the curriculum exists twice: in `curriculum.yaml`, and in 33
 * markdown frontmatter blocks. That is the only moment the two can be checked
 * against each other, and the only cheap place to catch a transcription slip
 * before the frontmatter is deleted and the yaml becomes the sole source. Once
 * the frontmatter is gone there is nothing left to reconcile and this file is
 * asserting a thing against itself, so it goes.
 *
 * It is a rule, not a fact (`tests/README.md`): it writes down no title, no
 * number and no duration. It says the two sources agree, and it fails if either
 * moves without the other.
 */

interface OnDisk {
  file: string
  module: number
  title: string
  status: string
  duration: number
  prerequisites: number[]
}

/** Every English module file, read straight off disk with no loader involved. */
function frontmatterOnDisk(): Map<string, OnDisk> {
  const found = new Map<string, OnDisk>()
  for (const category of CATEGORIES) {
    const dir = CATEGORY_DIRS[category.slug]
    for (const module of category.modules) {
      // The prefixed spelling, because that is what the corpus still carries at
      // this commit. When it stops, this file has already been deleted.
      const file = `${module.module}_${module.name}.md`
      const data = matter(readFileSync(join(CONTENT_ROOT, dir, file), 'utf8')).data
      found.set(module.name, {
        file: `${dir}/${file}`,
        module: data.module,
        title: data.title,
        status: data.status,
        duration: data.duration ?? 0,
        prerequisites: data.prerequisites ?? [],
      })
    }
  }
  return found
}

const disk = frontmatterOnDisk()
const numberOf = new Map(CURRICULUM_MODULES.map((module) => [module.name, module.module]))

describe('curriculum.yaml agrees with the frontmatter it is replacing', () => {
  it('finds a file for every module the yaml lists', () => {
    expect([...disk.keys()].sort()).toEqual([...numberOf.keys()].sort())
  })

  it.each(CURRICULUM_MODULES)(
    '$name: position, title, status, minutes and needs all match',
    (module) => {
      const file = disk.get(module.name)
      expect(file, module.name).toBeDefined()
      if (file === undefined) return

      // The position IS the number. This is the assertion the whole migration
      // turns on: if the yaml's order were transcribed wrongly by one line,
      // every number after it would move and this would say so.
      expect(file.module, `${file.file} number`).toBe(module.module)
      expect(file.title, `${file.file} title`).toBe(module.title)
      expect(file.status, `${file.file} status`).toBe(module.status)
      expect(file.duration, `${file.file} duration`).toBe(module.minutes)

      // `needs` names modules; `prerequisites` numbers them. Resolving one into
      // the other is what proves the rename carried the graph across intact.
      const asNumbers = module.needs
        .map((need) => numberOf.get(need) as number)
        .sort((a, b) => a - b)
      expect([...file.prerequisites].sort((a, b) => a - b), `${file.file} needs`)
        .toEqual(asNumbers)
    },
  )
})
