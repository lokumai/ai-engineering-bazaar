import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DependencyBlock } from '@/components/sheet/DependencyBlock'
import { Objectives } from '@/components/sheet/Objectives'
import { PrevNext } from '@/components/sheet/PrevNext'
import { ScheduleOfParts } from '@/components/sheet/ScheduleOfParts'
import { StatusBand } from '@/components/sheet/StatusBand'
import { TableOfContents } from '@/components/sheet/TableOfContents'
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
    expect(markup.match(/bz-aside-mark[^>]*><\/span>/g)).toHaveLength(1)
  })

  it('links each entry to its heading', () => {
    expect(markup).toContain('href="#what-is-different"')
  })

  it('renders nothing at all when the module has no sections', () => {
    expect(renderToStaticMarkup(<TableOfContents entries={[]} activeId={null} />)).toBe('')
  })

  it('never claims completion — no accent, no visited state', () => {
    expect(markup).not.toMatch(/accent|visited|complete/i)
  })
})

describe('Objectives (§5.5)', () => {
  /**
   * M16 stage 5 — the ORDINALS ARE GONE, and this test says so rather than
   * being deleted.
   *
   * `01`'s equivalent is `.goals`: a `leaf`-shaped card holding a plain bold
   * line and an unnumbered `<ul>`. The numbered column was the retired drawing
   * set's convention, and a numbered list here claimed these objectives have an
   * order they do not have. What survives is the card, its label and one item
   * per objective — which is the part a reader uses.
   */
  it('lists its items unnumbered, in the mockup’s leaf card', () => {
    const markup = renderToStaticMarkup(<Objectives items={['One', 'Two']} />)
    expect(markup).toContain('bz-card')
    expect(markup.match(/<li>/g)).toHaveLength(2)
    expect(markup, 'an ordinal column the mockup does not draw').not.toMatch(/>0\d<\/span>/)
  })

  it('renders nothing when the array is empty — no empty box', () => {
    expect(renderToStaticMarkup(<Objectives items={[]} />)).toBe('')
  })
})

describe('StatusBand (§4.5)', () => {
  const markup = renderToStaticMarkup(<StatusBand />)

  it('says both true things about a module that is planned', () => {
    expect(markup).toContain('Planned')
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
    expect(markup).toContain('Previous module')
    expect(markup).toContain('Next module')
  })

  /**
   * M18 — and the tile now says WHICH end.
   *
   * Both empty cells read `End of the course`, so on module 01 the tile where
   * the previous module would be announced the end of the thing the reader had
   * just started. A symmetry check could never have found it: both cells
   * rendering the same string is what symmetry looks like. A screenshot found
   * it. Asserting both strings is what keeps them from converging again.
   */
  it('marks the ends of the set rather than omitting a cell', () => {
    const first = renderToStaticMarkup(<PrevNext previous={null} next={drawn} />)
    expect(first).toContain('Start of the course')
    expect(first).not.toContain('End of the course')
    expect(first.match(/bz-pager-item/g)).toHaveLength(2)

    const last = renderToStaticMarkup(<PrevNext previous={drawn} next={null} />)
    expect(last).toContain('End of the course')
    expect(last).not.toContain('Start of the course')
    expect(last.match(/bz-pager-item/g)).toHaveLength(2)
  })

  it('tags a target that is planned, in words as well as line type', () => {
    const markup = renderToStaticMarkup(<PrevNext previous={drawn} next={notDrawn} />)
    expect(markup).toContain('Planned')
    expect(markup).toContain('data-draft=""')
  })

  it('does not tag a ready target', () => {
    const markup = renderToStaticMarkup(<PrevNext previous={drawn} next={drawn} />)
    expect(markup).not.toContain('Planned')
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
      <DependencyBlock relations={[{ label: 'Requirements', targets: [] }]} />,
    )
    expect(markup).toContain('—')
  })

  it('draws a link to an unready module as a hidden line', () => {
    const markup = renderToStaticMarkup(
      <DependencyBlock
        relations={[{
          label: 'Unlocks',
          targets: [
            { module: 12, title: 'Harness', path: '/a/', draft: false },
            { module: 16, title: 'Advanced UI', path: '/b/', draft: true },
          ],
        }]}
      />,
    )
    expect(markup).toContain('bz-hidden-x')
    expect(markup).toContain('bz-link')
  })
})
