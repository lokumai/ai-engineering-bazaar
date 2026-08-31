import { readFileSync } from 'node:fs'
import path from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DependencyBlock } from '@/components/sheet/DependencyBlock'
import { Objectives } from '@/components/sheet/Objectives'
import { PrevNext } from '@/components/sheet/PrevNext'
import { ScheduleOfParts } from '@/components/sheet/ScheduleOfParts'
import { StatusBand } from '@/components/sheet/StatusBand'
import { TableOfContents } from '@/components/sheet/TableOfContents'
import { TitleBlock, TitleStrip } from '@/components/sheet/TitleBlock'
import type { TocEntry } from '@/lib/content/render'

const TOC: TocEntry[] = [
  { id: 'what-is-different', text: 'What is actually different', depth: 2, mark: 'I' },
  { id: 'the-vocabulary', text: 'The vocabulary, pinned down', depth: 2, mark: 'II' },
  { id: 'quick-check', text: 'Quick Check', depth: 2 },
]

describe('TableOfContents — the section spine (§5.6)', () => {
  const markup = renderToStaticMarkup(
    <TableOfContents entries={TOC} activeId="the-vocabulary" />,
  )

  it('is the page\'s sections landmark', () => {
    expect(markup).toContain('aria-label="Sections"')
  })

  it('marks only the entry in view as current', () => {
    expect(markup.match(/aria-current="true"/g)).toHaveLength(1)
    expect(markup).toMatch(/aria-current="true"[^>]*>[\s\S]*?II/)
  })

  it('hangs the Roman numeral split off the heading at build time', () => {
    expect(markup).toContain('>I</span>')
    expect(markup).toContain('>II</span>')
  })

  it('gives a non-Roman h2 no numeral rather than an invented one', () => {
    expect(markup).toContain('>Quick Check</span>')
    expect(markup.match(/hl-toc-mark[^>]*><\/span>/g)).toHaveLength(1)
  })

  it('links each entry to its heading', () => {
    expect(markup).toContain('href="#what-is-different"')
  })

  it('renders nothing at all when the sheet has no sections', () => {
    expect(renderToStaticMarkup(<TableOfContents entries={[]} activeId={null} />)).toBe('')
  })

  it('never claims completion — no accent, no visited state', () => {
    expect(markup).not.toMatch(/accent|visited|complete/i)
  })
})

describe('TitleBlock — variant A (§5.5)', () => {
  const rows = [
    { label: 'DRAWING', value: '13' },
    { label: 'REVISION', value: 'b7225f8', preserveCase: true },
  ]
  const markup = renderToStaticMarkup(<TitleBlock rows={rows} />)

  it('is the page\'s complementary landmark', () => {
    expect(markup).toContain('aria-label="Title block"')
  })

  it('carries its header strip', () => {
    expect(markup).toContain('Title block</div>')
  })

  it('prints every row as a label/value pair', () => {
    expect(markup).toContain('<dt>DRAWING</dt>')
    expect(markup).toContain('13</dd>')
  })

  it('leaves a git short hash in its own case', () => {
    expect(markup).toContain('<span class="normal-case">b7225f8</span>')
  })

  it('shows no approval stamp slot, because there is no reader state yet', () => {
    expect(markup).not.toMatch(/stamp|approved|READ|QUIZ/i)
  })
})

describe('TitleStrip — variant B (§5.5)', () => {
  it('takes the class the sheet uses to hide it once the rail returns', () => {
    const markup = renderToStaticMarkup(
      <TitleStrip rows={[{ label: 'LANG', value: 'EN · TR' }]} className="xl:hidden" />,
    )
    expect(markup).toContain('class="xl:hidden"')
    expect(markup).toContain('EN · TR</dd>')
  })
})

describe('Objectives (§5.5)', () => {
  it('numbers its items in a fixed column', () => {
    const markup = renderToStaticMarkup(<Objectives items={['One', 'Two']} />)
    expect(markup).toContain('>01</span>')
    expect(markup).toContain('>02</span>')
  })

  it('renders nothing when the array is empty — no empty box', () => {
    expect(renderToStaticMarkup(<Objectives items={[]} />)).toBe('')
  })
})

describe('StatusBand (§4.5)', () => {
  const markup = renderToStaticMarkup(<StatusBand />)

  it('says both true things about a sheet that is not drawn', () => {
    expect(markup).toContain('Not yet drawn')
    expect(markup).toContain('Schedule of parts only')
  })
})

describe('ScheduleOfParts (§4.5)', () => {
  const markup = renderToStaticMarkup(
    <ScheduleOfParts parts={['A2A', 'Context delegation']} />,
  )

  it('is a table, not a bullet list', () => {
    expect(markup).toContain('<table')
    expect(markup).not.toContain('<ul')
  })

  it('names itself', () => {
    expect(markup).toContain('Schedule of parts</caption>')
  })

  it('numbers items from 01 in the ITEM column', () => {
    expect(markup).toContain('>01</td>')
    expect(markup).toContain('>02</td>')
  })

  it('has the two columns §4.5 names', () => {
    expect(markup).toContain('>Item</th>')
    expect(markup).toContain('>Description</th>')
  })

  it('renders nothing when there is no schedule', () => {
    expect(renderToStaticMarkup(<ScheduleOfParts parts={[]} />)).toBe('')
  })
})

describe('PrevNext (§5.7)', () => {
  const drawn = { module: 12, title: 'Harness Engineering', path: '/a/', draft: false }
  const notDrawn = { module: 16, title: 'Advanced UI', path: '/b/', draft: true }

  it('prints both directions', () => {
    const markup = renderToStaticMarkup(<PrevNext previous={drawn} next={drawn} />)
    expect(markup).toContain('Previous sheet')
    expect(markup).toContain('Next sheet')
  })

  it('marks the ends of the set rather than omitting a cell', () => {
    const markup = renderToStaticMarkup(<PrevNext previous={null} next={drawn} />)
    expect(markup).toContain('— End of set')
    expect(markup.match(/hl-prevnext-cell/g)).toHaveLength(2)
  })

  it('tags a target that is not drawn, in words as well as line type', () => {
    const markup = renderToStaticMarkup(<PrevNext previous={drawn} next={notDrawn} />)
    expect(markup).toContain('Not drawn')
    expect(markup).toContain('data-draft=""')
  })

  it('does not tag a drawn target', () => {
    const markup = renderToStaticMarkup(<PrevNext previous={drawn} next={drawn} />)
    expect(markup).not.toContain('Not drawn')
    expect(markup).not.toContain('data-draft')
  })

  it('is not a third navigation landmark', () => {
    const markup = renderToStaticMarkup(<PrevNext previous={drawn} next={drawn} />)
    expect(markup).not.toContain('<nav')
  })
})

describe('DependencyBlock (§4.6)', () => {
  it('prints an em dash for a relation with no edges', () => {
    const markup = renderToStaticMarkup(
      <DependencyBlock relations={[{ label: 'Requires', targets: [] }]} />,
    )
    expect(markup).toContain('—')
  })

  it('draws a link to an undrawn sheet as a hidden line', () => {
    const markup = renderToStaticMarkup(
      <DependencyBlock
        relations={[{
          label: 'Feeds',
          targets: [
            { module: 12, title: 'Harness', path: '/a/', draft: false },
            { module: 16, title: 'Advanced UI', path: '/b/', draft: true },
          ],
        }]}
      />,
    )
    expect(markup).toContain('hl-hidden-x')
    expect(markup).toContain('hl-link')
  })
})

describe('sheet.css holds the line (§11)', () => {
  const css = readFileSync(
    path.resolve(process.cwd(), 'src', 'app', 'sheet.css'),
    'utf8',
  )

  it('has no border radius anywhere (T7, §11.1)', () => {
    expect(css).not.toMatch(/border-radius/)
  })

  it('has no box-shadow (§11.6)', () => {
    expect(css).not.toMatch(/box-shadow/)
  })

  it('has no backdrop blur (§11.7)', () => {
    expect(css).not.toMatch(/blur\(|backdrop-filter/)
  })

  it('has no hardcoded colour — every ink is a token (§11.24)', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(css).not.toMatch(/\b(rgb|hsl|oklch)\(/)
  })

  it('never transitions a transform, a shadow or an opacity (§9.2, §11.32)', () => {
    for (const rule of css.match(/transition:[^;]+;/g) ?? []) {
      expect(rule).not.toMatch(/transform|shadow|opacity|all\b/)
    }
  })

  it('dashes every hidden line at exactly 3 on, 2 off (ISO 128)', () => {
    const dashes = css.match(/repeating-linear-gradient\([^)]*\)[^;]*/g) ?? []
    expect(dashes.length).toBeGreaterThan(0)
    for (const dash of dashes) {
      expect(dash).toMatch(/0 3px,\s*transparent 3px 5px/)
    }
  })

  it('never paints the annotation pen as a resting state (T1)', () => {
    for (const [, block] of css.matchAll(/\{([^{}]*)\}/g)) {
      if (!/--color-accent\b/.test(block)) continue
      // The pen may only appear where a link is being underlined on hover.
      expect(block).toMatch(/--hl-hidden-ink/)
    }
  })
})
