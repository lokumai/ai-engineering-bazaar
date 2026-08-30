import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '@/lib/content/categories'
import { CONTENT_ROOT } from '@/lib/content/paths'
import {
  stripBuildFurniture,
  stripProgressSection,
  stripSequenceLinks,
} from '@/lib/content/strip'

const MODULE_FILE = /^\d+_.+\.md$/

function everyModuleFile(): string[] {
  const out: string[] = []
  for (const category of CATEGORIES) {
    const dir = path.join(CONTENT_ROOT, category.dir)
    for (const filename of fs.readdirSync(dir).sort()) {
      if (!MODULE_FILE.test(filename)) continue
      out.push(path.join(dir, filename))
    }
  }
  return out
}

describe('stripProgressSection', () => {
  it('removes the heading and its body, up to the next h2', () => {
    const md = [
      '## Real Section',
      '',
      'kept',
      '',
      '## Tutorial Progress',
      '',
      '```mermaid',
      'graph LR',
      '    A --> B',
      '```',
      '',
      '## Summary',
      '',
      'also kept',
      '',
    ].join('\n')

    const stripped = stripProgressSection(md)
    expect(stripped).not.toContain('Tutorial Progress')
    expect(stripped).not.toContain('graph LR')
    expect(stripped).toContain('kept')
    expect(stripped).toContain('## Summary')
    expect(stripped).toContain('also kept')
  })

  it('removes a progress section that runs to the end of the file', () => {
    const md = '## Body\n\ntext\n\n## Tutorial Progress\n\nrail\n'
    expect(stripProgressSection(md)).toBe('## Body\n\ntext\n')
  })

  it('removes the Turkish rail as well', () => {
    const md = '## Gövde\n\nmetin\n\n## Eğitim İlerlemesi\n\nray\n\n## Özet\n\nson\n'
    const stripped = stripProgressSection(md)
    expect(stripped).not.toContain('İlerlemesi')
    expect(stripped).toContain('## Özet')
  })

  it('leaves an h3 named the same alone — the rail is always an h2', () => {
    const md = '### Tutorial Progress\n\nnot the rail\n'
    expect(stripProgressSection(md)).toBe(md)
  })

  it('leaves a module with no rail untouched', () => {
    const md = '## Only Section\n\ntext\n'
    expect(stripProgressSection(md)).toBe(md)
  })
})

describe('stripSequenceLinks', () => {
  it('removes the English previous/next furniture', () => {
    const md = [
      'last real paragraph',
      '',
      '**Previous Module:** [Module 7: Multi-Agent](../1_fundamentals/7_multi_agent.md)',
      '**Next Module:** [Module 9: Context Engineering](9_context_engineering.md)',
      '',
    ].join('\n')
    expect(stripSequenceLinks(md)).toBe('last real paragraph\n')
  })

  it('removes the Turkish furniture and the category variants', () => {
    const md = [
      'metin',
      '',
      '**Önceki Modül:** [Modül 6](6_agents.md)',
      '**Sonraki Kategori:** [Intermediate →](../2_intermediate/README.md)',
      '',
    ].join('\n')
    expect(stripSequenceLinks(md)).toBe('metin\n')
  })

  it('leaves prose that merely mentions the next module alone', () => {
    const md = 'The **Next Module:** idea is discussed inline here.\n'
    expect(stripSequenceLinks(md)).toBe(md)
  })
})

describe('stripBuildFurniture', () => {
  it('is idempotent', () => {
    const raw = fs.readFileSync(
      path.join(CONTENT_ROOT, '1_fundamentals', '1_llms.md'),
      'utf8',
    )
    const once = stripBuildFurniture(raw)
    expect(stripBuildFurniture(once)).toBe(once)
  })

  it('leaves no progress rail anywhere in the corpus, English or Turkish', () => {
    for (const file of everyModuleFile()) {
      const stripped = stripBuildFurniture(fs.readFileSync(file, 'utf8'))
      expect(stripped, file).not.toMatch(/^##\s+(Tutorial Progress|Eğitim İlerlemesi)/m)
      expect(stripped, file).not.toMatch(/^\*\*(Previous|Next) Module:\*\*/m)
      expect(stripped, file).not.toMatch(/^\*\*(Önceki|Sonraki) Modül:\*\*/m)
    }
  })

  it('keeps every module non-empty and keeps its h1', () => {
    for (const file of everyModuleFile()) {
      const stripped = stripBuildFurniture(fs.readFileSync(file, 'utf8'))
      expect(stripped.trim().length, file).toBeGreaterThan(0)
    }
  })

  it('does not edit the files on disk', () => {
    const file = path.join(CONTENT_ROOT, '1_fundamentals', '1_llms.md')
    const before = fs.readFileSync(file, 'utf8')
    stripBuildFurniture(before)
    expect(fs.readFileSync(file, 'utf8')).toBe(before)
  })
})
