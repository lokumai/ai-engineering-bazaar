import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATEGORY_DIRS, CATEGORY_SLUGS } from '@/lib/content/categories'
import { CONTENT_ROOT } from '@/lib/content/paths'
import {
  stripBuildFurniture,
  stripLeadIn,
  stripProgressSection,
  stripSequenceLinks,
} from '@/lib/content/strip'

const MODULE_FILE = /^[a-z0-9_]+\.md$/

function everyModuleFile(): string[] {
  const out: string[] = []
  for (const slug of CATEGORY_SLUGS) {
    const dir = path.join(CONTENT_ROOT, CATEGORY_DIRS[slug])
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
      '**Previous Module:** [Multi-Agent Systems](../1_fundamentals/multi_agent.md)',
      '**Next Module:** [Context Engineering](context_engineering.md)',
      '',
    ].join('\n')
    expect(stripSequenceLinks(md)).toBe('last real paragraph\n')
  })

  it('removes the Turkish furniture and the category variants', () => {
    const md = [
      'metin',
      '',
      '**Önceki Modül:** [AI Agents](agents.md)',
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
      path.join(CONTENT_ROOT, '1_fundamentals', 'llms.md'),
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
    const file = path.join(CONTENT_ROOT, '1_fundamentals', 'llms.md')
    const before = fs.readFileSync(file, 'utf8')
    stripBuildFurniture(before)
    expect(fs.readFileSync(file, 'utf8')).toBe(before)
  })
})

describe('stripLeadIn', () => {
  it('drops the h1 the sheet renders from frontmatter instead (B6.1)', () => {
    expect(stripLeadIn('# Module 13: Security\n\nProse.\n')).toBe('\nProse.\n')
  })

  it('drops the italic dek the title block already states (B6.2)', () => {
    const md = '# Module 13: Security\n\n*Category: Intermediate — Module 13 (6 of 8 in this category)*\n\nProse.\n'
    expect(stripLeadIn(md)).toBe('\n\nProse.\n')
  })

  it('drops the Turkish dek too, since the ratio compares both sides', () => {
    const md = '# Modül 16: Gelişmiş UI\n\n*Kategori: Uzman — Modül 16*\n\nMetin.\n'
    expect(stripLeadIn(md)).toBe('\n\nMetin.\n')
  })

  it('leaves a body with no h1 and no dek exactly as it found it', () => {
    expect(stripLeadIn('Prose.\n\n## I. Section\n')).toBe('Prose.\n\n## I. Section\n')
  })

  it('never touches a later h1 or a later italic line', () => {
    const md = '# One\n\nProse.\n\n# Two\n\n*Category: not the dek*\n'
    expect(stripLeadIn(md)).toContain('# Two')
    expect(stripLeadIn(md)).toContain('*Category: not the dek*')
  })

  it('does not mistake the lead paragraph for a dek', () => {
    // Modules 1-7 run the h1 straight into prose, with no dek between them.
    const md = '# Module 1: LLM Fundamentals\n\nWelcome to the first module!\n'
    expect(stripLeadIn(md)).toContain('Welcome to the first module!')
  })

  it('strips exactly what the corpus puts above the lead paragraph', () => {
    for (const file of everyModuleFile()) {
      const raw = fs.readFileSync(file, 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '')
      const stripped = stripLeadIn(raw)
      expect(stripped, file).not.toMatch(/^\s*#[ \t]/)
      expect(stripped, file).not.toMatch(/^\s*\*(Category|Kategori):/)
    }
  })
})
