import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ContinueLine, Diagram, DiagramReadout } from '@/components/record/Diagram'
import { EmptyState, emptyStateCopy } from '@/components/record/EmptyState'
import { Stamp } from '@/components/record/Stamp'
import { StampShelf } from '@/components/record/StampShelf'
import { Uptime } from '@/components/record/Uptime'
import { TickGauge, ticksFrom } from '@/components/sheet/TickGauge'
import type { CurriculumFacts, Stamp as StampRecord } from '@/lib/record/derive'
import type { LayoutEdgeInput, LayoutFacts } from '@/lib/record/layout'

/**
 * §12.10, §12.13, §5.9 — the dashboard's server markup.
 *
 * `renderToStaticMarkup` on the HTML string, with no jsdom, no Testing Library
 * and no new dependency (§12.14.2). What that pins is exactly the thing worth
 * pinning: **the honest empty first frame.** `useSyncExternalStore` returns the
 * frozen `EMPTY_RECORD` here for the same reason it does in the browser's first
 * render, so every assertion below is an assertion about the prerender a reader
 * actually receives — nothing signed off, every drawn sheet solid and unsigned,
 * every stamp printing its threshold against a count of zero, and the uptime
 * label at `--` because the build does not know what day it is.
 *
 * Real interaction, real storage, the roving focus in a real browser and the
 * `forced-colors` treatment are Playwright's, in real Chrome.
 */

/**
 * Six subsystems and eight sheets, so the fixture can carry §7.4's **nine**
 * set-level stamps — six subsystem stamps plus FULL SET, SOURCES and BILINGUAL
 * — without reaching for the real corpus. Two sheets are undrawn, because a
 * band that is entirely dashed and a band that is partly dashed behave
 * differently and both are real today.
 */
const SHEETS = [
  { slug: 'alpha/one', module: 1, title: 'One', category: 'alpha', drawn: true },
  { slug: 'alpha/two', module: 2, title: 'Two', category: 'alpha', drawn: true },
  { slug: 'beta/three', module: 3, title: 'Three', category: 'beta', drawn: true },
  { slug: 'beta/four', module: 4, title: 'Four', category: 'beta', drawn: false },
  { slug: 'gamma/five', module: 5, title: 'Five', category: 'gamma', drawn: true },
  { slug: 'delta/six', module: 6, title: 'Six', category: 'delta', drawn: true },
  { slug: 'epsilon/seven', module: 7, title: 'Seven', category: 'epsilon', drawn: true },
  { slug: 'zeta/eight', module: 8, title: 'Eight', category: 'zeta', drawn: false },
]

const CATEGORIES = [
  { slug: 'alpha', title: 'Alpha', order: 1, total: 2 },
  { slug: 'beta', title: 'Beta', order: 2, total: 2 },
  { slug: 'gamma', title: 'Gamma', order: 3, total: 1 },
  { slug: 'delta', title: 'Delta', order: 4, total: 1 },
  { slug: 'epsilon', title: 'Epsilon', order: 5, total: 1 },
  { slug: 'zeta', title: 'Zeta', order: 6, total: 1 },
]

const LAYOUT_FACTS: LayoutFacts = { sheets: SHEETS, categories: CATEGORIES }

const EDGES: readonly LayoutEdgeInput[] = [
  { from: 1, to: 2, kind: 'requires' },
  // Cross-band, alpha → beta, so the bus at x = 160 is exercised too.
  { from: 1, to: 3, kind: 'requires' },
]

/**
 * `satisfies` rather than an annotation, so the literal keeps its own element
 * type: `CurriculumFacts` does not declare `title`, and `ContinueLine` needs
 * both shapes at once — which is exactly what `curriculumFacts()` returns.
 */
const FACTS = {
  sheets: SHEETS.map((sheet) => ({
    ...sheet,
    hasQuickCheck: sheet.drawn,
    checklistItems: 0,
    sources: 0,
  })),
  categories: CATEGORIES,
  traces: EDGES.length,
} satisfies CurriculumFacts

const DIAGRAM = renderToStaticMarkup(<Diagram facts={LAYOUT_FACTS} edges={EDGES} />)

describe('§12.10.1 — the accessibility contract that overrides §10.1', () => {
  it('is a graphics-document and never role="img"', () => {
    expect(DIAGRAM).toContain('role="graphics-document"')
    // `role="img"` has presentational children under ARIA 1.2 and would erase
    // every node label. This assertion is the whole point of §12.10.1, and it
    // is scoped to the drawing's own root: a tick gauge elsewhere on the page
    // is legitimately an image of a count.
    expect(DIAGRAM).toMatch(/<svg class="hl-diagram"[^>]*role="graphics-document"/)
    expect(DIAGRAM).not.toMatch(/<svg class="hl-diagram"[^>]*role="img"/)
  })

  it('names and describes itself from a real <title> and <desc>', () => {
    expect(DIAGRAM).toContain('aria-labelledby="hl-diagram-name"')
    expect(DIAGRAM).toContain('aria-describedby="hl-diagram-desc"')
    // Both must have text in them. React renders <title> EMPTY when it is
    // handed an array of children, which would leave the drawing nameless.
    expect(DIAGRAM).toContain(
      '<title id="hl-diagram-name">Drawing set — 8 sheets in 6 subsystems</title>',
    )
    expect(DIAGRAM).toMatch(/<desc id="hl-diagram-desc">[^<]{40}/)
  })

  it('gives every band a graphics-object with a counted name', () => {
    expect(DIAGRAM.match(/role="graphics-object"/g)).toHaveLength(6)
    expect(DIAGRAM).toContain('aria-label="Subsystem 01 — Alpha — 0 of 2 signed off"')
    expect(DIAGRAM).toContain('aria-label="Subsystem 02 — Beta — 0 of 2 signed off"')
  })

  it('gives every node a graphics-symbol named from aria-label', () => {
    expect(DIAGRAM.match(/role="graphics-symbol"/g)).toHaveLength(8)
    expect(DIAGRAM).toContain('aria-label="Sheet 1 — One — not signed off"')
    expect(DIAGRAM).toContain('aria-label="Sheet 2 — Two — not signed off — requires 1"')
    // A sheet nobody has drawn says so, and says nothing about the reader.
    expect(DIAGRAM).toContain('aria-label="Sheet 4 — Four — not drawn"')
    expect(DIAGRAM).toContain('aria-label="Sheet 8 — Eight — not drawn"')
  })

  it('hides the rails and traces, whose facts the labels already carry', () => {
    expect(DIAGRAM).toContain('<g aria-hidden="true">')
    expect(DIAGRAM).toContain('class="hl-rail"')
    expect(DIAGRAM).toContain('class="hl-trace"')
  })

  it('draws the four node states from the record, not from the build', () => {
    // The prerender: six drawn sheets unsigned, two undrawn sheets dashed. Each
    // node appears twice — the wide drawing and the stacked form below 1024px
    // are both always in the DOM and only one of them is ever displayed.
    expect(DIAGRAM.match(/data-state="unread"/g)).toHaveLength(12)
    expect(DIAGRAM.match(/data-state="draft"/g)).toHaveLength(4)
    expect(DIAGRAM).not.toContain('data-state="signed"')
  })
})

describe('§12.10.2 — one tab stop, roving tabindex, focus ring inside the SVG', () => {
  it('holds exactly one tabbable node', () => {
    expect(DIAGRAM.match(/tabindex="0"/g)).toHaveLength(1)
    expect(DIAGRAM.match(/tabindex="-1"/g)).toHaveLength(7)
  })

  it('draws its own focus ring rather than relying on the UA outline', () => {
    expect(DIAGRAM.match(/class="hl-node-focus"/g)).toHaveLength(8)
    // A path, not a rect: `.hl-node[data-state="draft"] rect` would dash it.
    expect(DIAGRAM).toMatch(/<path class="hl-node-focus"/)
  })
})

describe('§12.10.3 — the table equivalent is mandatory, not optional', () => {
  it('is in the DOM while the disclosure is collapsed', () => {
    expect(DIAGRAM).toContain('<details class="hl-diagram-table">')
    expect(DIAGRAM).not.toContain('<details class="hl-diagram-table" open')
    // Collapsed and still there: it is the only form in which a reader can
    // verify a dependency claim, and record.css forces it open in print.
    expect(DIAGRAM).toContain('<table')
    expect(DIAGRAM).toContain('<summary>')
  })

  it('carries §12.10.3\'s six columns', () => {
    for (const column of ['#', 'Sheet', 'Subsystem', 'State', 'Requires', 'Feeds']) {
      expect(DIAGRAM).toContain(`>${column}</th>`)
    }
  })

  it('gives every sheet in the set a row and a real link', () => {
    expect(DIAGRAM.match(/<th scope="row"/g)).toHaveLength(8)
    // `trailingSlash` is next.config's business and it is not loaded here, so
    // the assertion is on the route rather than on its final slash — the same
    // note `manifest.test.tsx` carries.
    expect(DIAGRAM).toContain('href="/courses/beta/three')
    expect(DIAGRAM).toContain('href="/courses/beta/four')
  })

  it('prints the same state text and the same relations as the diagram', () => {
    expect(DIAGRAM).toContain('NOT SIGNED OFF')
    expect(DIAGRAM).toContain('NOT DRAWN')
    // §11.25 — a dash where there is nothing, never an invented zero.
    expect(DIAGRAM).toContain('>—</td>')
  })

  it('lives in one figure with the SVG and a figcaption', () => {
    expect(DIAGRAM.startsWith('<figure')).toBe(true)
    expect(DIAGRAM).toContain('<figcaption class="hl-diagram-title">')
    expect(DIAGRAM.match(/<figure/g)).toHaveLength(1)
  })
})

describe('§12.10.4 — state is never carried by colour alone', () => {
  it('spells out both carriers in a literal legend', () => {
    expect(DIAGRAM).toContain('class="hl-diagram-legend')
    expect(DIAGRAM).toContain('Solid outline')
    expect(DIAGRAM).toContain('Dashed outline')
    expect(DIAGRAM).toContain('Sheet not yet drawn')
    expect(DIAGRAM).toContain('Signed off in this browser')
    expect(DIAGRAM).toContain('Sequence, not a dependency')
  })

  it('names both trace kinds and what an accent trace means', () => {
    expect(DIAGRAM).toContain('Solid trace above a band')
    expect(DIAGRAM).toContain('Dashed trace below a band')
    expect(DIAGRAM).toContain('Both ends signed off')
  })
})

describe('§4.10.5 — below 1024px, stacked blocks and not a pan/zoom', () => {
  it('ships the same graph a second way, with the edges as plain text', () => {
    expect(DIAGRAM).toContain('max-lg:hidden')
    expect(DIAGRAM).toContain('lg:hidden')
    expect(DIAGRAM).toContain('2 REQUIRES 1')
    expect(DIAGRAM).toContain('height:52px')
  })

  it('puts no duplicate id on the second copy of a node', () => {
    const ids = DIAGRAM.match(/id="hl-node-[^"]+"/g) ?? []
    expect(ids).toHaveLength(8)
    expect(new Set(ids).size).toBe(8)
    expect(DIAGRAM).toContain('id="hl-node-alpha-one"')
  })
})

describe('§12.10.6 — CONTINUE, and its absence', () => {
  it('names the next ready sheet nothing has been signed off on', () => {
    const markup = renderToStaticMarkup(<ContinueLine facts={FACTS} />)
    expect(markup).toContain('href="/courses/alpha/one')
    expect(markup).toContain('Sheet 01 · One')
  })

  it('renders nothing at all when there is no ready sheet left', () => {
    const drafts = {
      ...FACTS,
      sheets: FACTS.sheets.map((sheet) => ({ ...sheet, drawn: false })),
    } satisfies CurriculumFacts
    expect(renderToStaticMarkup(<ContinueLine facts={drafts} />)).toBe('')
  })
})

describe('§5.9 / §12.5.4 — a locked stamp always states threshold and count', () => {
  const locked: StampRecord = {
    id: 'sources-100',
    label: 'SOURCES · 100',
    earned: null,
    threshold: 25,
    current: 18,
    attainable: true,
    reason: null,
  }

  it('prints the exact threshold and the live count', () => {
    const markup = renderToStaticMarkup(<Stamp stamp={locked} size="set" />)
    expect(markup).toContain('18 OF 25')
    expect(markup).toContain('SOURCES · 100')
    expect(markup).toContain('data-earned="false"')
    // Never a padlock, never a silhouette, never a mystery (§7.7).
    expect(markup).not.toMatch(/locked|\?|🔒/i)
  })

  it('states why an unattainable stamp cannot be reached, in sheets drawn', () => {
    const markup = renderToStaticMarkup(
      <Stamp
        stamp={{ ...locked, attainable: false, reason: '0 OF 9 SHEETS DRAWN' }}
        size="set"
      />,
    )
    expect(markup).toContain('18 OF 25')
    expect(markup).toContain('LOCKED · 0 OF 9 SHEETS DRAWN')
    expect(markup).toContain('data-attainable="false"')
  })

  it('reads as a completed inspection record once met, never as a prize', () => {
    const markup = renderToStaticMarkup(
      <Stamp
        stamp={{ ...locked, current: 25, earned: '2026-08-14T09:00:00.000Z' }}
        size="set"
      />,
    )
    expect(markup).toContain('APPROVED 2026-08-14')
    expect(markup).toContain('data-earned="true"')
  })

  it('says a date is absent rather than inventing one', () => {
    const markup = renderToStaticMarkup(
      <Stamp stamp={{ ...locked, current: 25, earned: null }} size="set" />,
    )
    expect(markup).toContain('APPROVED · DATE NOT ON RECORD')
  })

  it('takes §5.9\'s two sizes and no others', () => {
    expect(renderToStaticMarkup(<Stamp stamp={locked} size="slot" />)).toContain(
      'hl-stamp hl-stamp-slot',
    )
    expect(renderToStaticMarkup(<Stamp stamp={locked} size="set" />)).toContain(
      'hl-stamp hl-stamp-set',
    )
  })
})

describe('§7.4 — the set-level stamp shelf, at zero data', () => {
  const SHELF = renderToStaticMarkup(<StampShelf facts={FACTS} />)

  it('renders all nine set-level stamps, none of them earned', () => {
    expect(SHELF).toContain('class="hl-stamp-shelf"')
    expect(SHELF.match(/class="hl-stamp hl-stamp-set"/g)).toHaveLength(9)
    expect(SHELF.match(/<li>/g)).toHaveLength(9)
    expect(SHELF).not.toContain('data-earned="true"')
  })

  it('prints each subsystem\'s real total as its threshold', () => {
    expect(SHELF).toContain('SUBSYSTEM 01 · ALPHA')
    expect(SHELF).toContain('0 OF 2')
    expect(SHELF).toContain('FULL SET')
    expect(SHELF).toContain('0 OF 8')
  })

  it('says what the corpus cannot supply, rather than hiding the slot', () => {
    expect(SHELF).toContain('LOCKED · 1 OF 2 SHEETS DRAWN')
    expect(SHELF).toContain('TURKISH ROUTES NOT BUILT')
  })
})

describe('§7.3 / §12.5.5 — UPTIME, and no deficit anywhere near it', () => {
  const STRIP = renderToStaticMarkup(<Uptime />)

  it('draws fourteen ticks, none of them claiming a day', () => {
    expect(STRIP.match(/class="hl-uptime-tick"/g)).toHaveLength(14)
    expect(STRIP.match(/data-active="false"/g)).toHaveLength(14)
    expect(STRIP).not.toContain('data-today')
  })

  it('prints no reading until the day is known', () => {
    expect(STRIP).toContain('UPTIME --')
    expect(STRIP).toContain('not yet read')
  })

  it('carries no flame, no streak language, and no loss aversion', () => {
    expect(STRIP).not.toMatch(/streak|flame|don't|lose|keep going|!/i)
  })
})

describe('§12.13 — four empty-state classes, four different copies', () => {
  it('class 1 · NEVER STARTED states the count and offers one path', () => {
    const markup = renderToStaticMarkup(
      <EmptyState
        state={{
          kind: 'never-started',
          of: 32,
          firstSheet: { label: 'Open sheet 01', path: '/courses/alpha/one/' },
        }}
      />,
    )
    expect(markup).toContain('SIGNED OFF 00 / 32')
    expect(markup).toContain('Nothing is signed off yet.')
    expect(markup).toContain('Open sheet 01')
    expect(markup.match(/<a /g)).toHaveLength(1)
    expect(markup).toContain('data-hl-empty="never-started"')
  })

  it('class 2 · CLEARED BY YOU names the reader\'s own act and its date', () => {
    const markup = renderToStaticMarkup(
      <EmptyState state={{ kind: 'cleared', of: 32, on: '2026-08-14T09:00:00.000Z' }} />,
    )
    expect(markup).toContain("You erased this browser&#x27;s record on 2026-08-14.")
    expect(markup).toContain('Import a record from a file')
  })

  it('class 3 · NO MATCH announces the count in a status region', () => {
    const markup = renderToStaticMarkup(
      <EmptyState state={{ kind: 'no-match', matched: 0, of: 32, clear: () => {} }} />,
    )
    expect(markup).toContain('role="status"')
    expect(markup).toContain('NO SHEETS MATCH FILTER — 0 of 32')
    expect(markup).toContain('Clear the filter')
    expect(markup).not.toContain('role="alert"')
  })

  it('class 4 · STORAGE UNAVAILABLE explains it and keeps export reachable', () => {
    const markup = renderToStaticMarkup(
      <EmptyState state={{ kind: 'storage-unavailable' }} />,
    )
    expect(markup).toContain('role="alert"')
    expect(markup).toContain('STORAGE: UNAVAILABLE')
    expect(markup).toContain('Private windows and blocked cookies both do this.')
    expect(markup).toContain('Export what is in memory')
  })

  it('carries no illustration and no mascot in any class', () => {
    for (const state of [
      { kind: 'never-started' as const, of: 32, firstSheet: { label: 'Open sheet 01', path: '/' } },
      { kind: 'cleared' as const, of: 32, on: null },
      { kind: 'no-match' as const, matched: 0, of: 32, clear: () => {} },
      { kind: 'storage-unavailable' as const },
    ]) {
      const markup = renderToStaticMarkup(<EmptyState state={state} />)
      expect(markup).not.toMatch(/<svg|<img|hl-face|Lkm/)
    }
  })

  it('keeps the four copies apart — they answer different questions', () => {
    const copies = (
      [
        { kind: 'never-started', of: 32, firstSheet: { label: 'x', path: '/' } },
        { kind: 'cleared', of: 32, on: null },
        { kind: 'no-match', matched: 0, of: 32, clear: () => {} },
        { kind: 'storage-unavailable' },
      ] as const
    ).map((state) => emptyStateCopy(state).cue)
    expect(new Set(copies.filter((cue) => cue !== null)).size).toBe(3)
  })
})

describe('§12.14.1 — the copy register, on every new string this slice ships', () => {
  const BANNED = [
    'easy',
    'just ',
    'simply',
    'quick ',
    'please',
    'sorry',
    'invalid',
    'oops',
    'you forgot',
    'great work',
    "you're all set",
    'nice try',
    'keep going',
  ]

  const SURFACES = [
    DIAGRAM,
    renderToStaticMarkup(<StampShelf facts={FACTS} />),
    renderToStaticMarkup(<Uptime />),
    renderToStaticMarkup(<ContinueLine facts={FACTS} />),
    renderToStaticMarkup(
      <EmptyState
        state={{ kind: 'never-started', of: 32, firstSheet: { label: 'x', path: '/' } }}
      />,
    ),
    renderToStaticMarkup(<EmptyState state={{ kind: 'storage-unavailable' }} />),
  ]

  it('contains no exclamation mark anywhere', () => {
    for (const markup of SURFACES) expect(markup).not.toContain('!')
  })

  it('contains none of the banned words', () => {
    for (const markup of SURFACES) {
      const text = markup.replace(/<[^>]*>/g, ' ').toLowerCase()
      for (const word of BANNED) expect(text).not.toContain(word)
    }
  })

  it('never speaks as a person about what it did', () => {
    for (const markup of SURFACES) {
      expect(markup).not.toMatch(/\bI (saved|have|will|can)\b/)
      expect(markup).not.toMatch(/we('ve| have| will)/i)
    }
  })
})

describe('§7.5 — the tick gauge gains the approved state, hook-free', () => {
  it('emits approved only when a caller that knows the reader says so', () => {
    expect(ticksFrom([{ drawn: true }, { drawn: false }])).toEqual(['drawn', 'not-drawn'])
    expect(ticksFrom([{ drawn: true, approved: true }, { drawn: true, approved: false }]))
      .toEqual(['approved', 'drawn'])
  })

  it('never claims approved for a sheet nobody has drawn', () => {
    expect(ticksFrom([{ drawn: false, approved: false }])).toEqual(['not-drawn'])
  })

  it('carries the state in the markup, not only in a fill', () => {
    const markup = renderToStaticMarkup(
      <TickGauge ticks={['approved', 'drawn', 'not-drawn']} />,
    )
    expect(markup).toContain('data-state="approved"')
    expect(markup).toContain('data-state="drawn"')
    expect(markup).toContain('data-state="not-drawn"')
    // The ISO 128 dash stays the primary carrier for a sheet not yet drawn.
    expect(markup).toContain('stroke-dasharray="3 2"')
  })

  it('paints the accent on an approved tick and nowhere else', () => {
    const markup = renderToStaticMarkup(<TickGauge ticks={['approved', 'drawn']} />)
    expect(markup.match(/var\(--color-accent\)/g)).toHaveLength(1)
  })

  it('drives the dashboard band gauges from the same rows as the drawing', () => {
    // Six drawn sheets and two undrawn, once in the wide drawing's band
    // headers and once in the stacked form's.
    expect(DIAGRAM.match(/data-state="drawn"/g)).toHaveLength(12)
    expect(DIAGRAM.match(/data-state="not-drawn"/g)).toHaveLength(4)
  })
})

describe('§7.1 — the readout strip the dashboard fills TRACES for', () => {
  const STRIP = renderToStaticMarkup(<DiagramReadout facts={FACTS} edges={EDGES} />)

  it('renders the shell\'s single §7.1 strip rather than a second one', () => {
    expect(STRIP).toContain('class="hl-readout"')
    expect(STRIP).toContain('data-variant="full"')
  })

  it('prints no reading at all until the store has answered', () => {
    expect(STRIP).toContain('data-hydrated="false"')
    // §11.35 / §12.5.7 — no percentage anywhere, ever.
    expect(STRIP).not.toContain('%')
  })

  it('supplies the TRACES denominator the record\'s facts carry', () => {
    expect(STRIP).toMatch(/Traces/)
    expect(STRIP).toContain(`/${EDGES.length}`)
  })
})
