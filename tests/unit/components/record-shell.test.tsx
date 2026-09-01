import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Lkm01 } from '@/components/mascot/Lkm01'
import { FACES, type Lkm01Progress } from '@/components/mascot/geometry'
import { Readout } from '@/components/record/Readout'
import { PageShell } from '@/components/shell/PageShell'
import { SiteFooter } from '@/components/shell/SiteFooter'
import { SiteHeader } from '@/components/shell/SiteHeader'
import { curriculumFacts } from '@/lib/content/facts'
import { recordBootScript } from '@/lib/record/boot'
import type { CurriculumFacts } from '@/lib/record/derive'

/**
 * §12.2 — the shell's first frame, which is the only frame a static export can
 * be held to. Every one of these assertions is about the HTML the build emits
 * for a reader it has never met: the mascot that must not vary by state, and the
 * readout that must say `--` rather than a number it cannot know.
 *
 * The open shortcut sheet is deliberately absent: Radix portals into
 * `document.body`, there is no DOM here (§12.14.2 — no jsdom), and a dialog's
 * focus trap and key handling are Playwright's job in real Chrome. What is
 * testable here is the trigger, which is what ships in the prerendered header.
 */

/** 32 sheets, 15 drawn — the corpus's own shape, without reading it. */
const FACTS: CurriculumFacts = {
  sheets: Array.from({ length: 32 }, (_, i) => ({
    slug: `subsystem/sheet-${i + 1}`,
    module: i + 1,
    category: 'fundamentals',
    drawn: i < 15,
    hasQuickCheck: i < 15,
    checklistItems: i === 12 ? 8 : 0,
    sources: 5,
  })),
  categories: [{ slug: 'fundamentals', total: 32 }],
  traces: 32,
}

function values(markup: string): string[] {
  return [...markup.matchAll(/class="hl-readout-value[^"]*">([^<]*)</g)].map((m) => m[1])
}

describe('the header mark is state-independent (§12.2)', () => {
  const ALL_COMPLETE: Lkm01Progress = Object.fromEntries(
    FACES.map((f) => [f.category, { approved: 1, total: 1 }]),
  )

  it('emits the same bytes for an empty record and a finished one', () => {
    expect(renderToStaticMarkup(<Lkm01 progress={ALL_COMPLETE} />))
      .toBe(renderToStaticMarkup(<Lkm01 progress={0} />))
  })

  it('puts that same mark in the header, with nothing added around it', () => {
    const header = renderToStaticMarkup(<SiteHeader />)
    expect(header).toContain(renderToStaticMarkup(<Lkm01 />))
    expect(header).toContain('data-slot="mascot"')
    // §12.18 — the mascot no longer flips its accessible name, in any state.
    expect(header).not.toContain('role="img"')
    expect(header).not.toContain('Progress:')
  })

  it('hands all six faces to record.css, one per subsystem', () => {
    const header = renderToStaticMarkup(<SiteHeader />)
    expect(header.match(/class="hl-face"/g)).toHaveLength(6)
    expect(header.match(/class="hl-face-hatch"/g)).toHaveLength(6)
    for (const face of FACES) expect(header, face.id).toContain(`data-cat="${face.category}"`)
  })
})

describe('the header affordances (§5.1, §12.16)', () => {
  const header = renderToStaticMarkup(<SiteHeader />)

  it('offers the identity affordance as a 28 × 28 icon button', () => {
    // `next/link` owns the trailing slash — `trailingSlash: true` is applied by
    // the router, not by the href as written (see `lib/url.ts`).
    expect(header).toMatch(/<a[^>]*class="hl-icon-btn"[^>]*href="\/profile\/?"/)
    expect(header).toContain('aria-label="Profile"')
  })

  it('prints the shortcut sheet trigger, with its own key as the glyph', () => {
    expect(header).toContain('aria-label="Keyboard shortcuts"')
    expect(header).toMatch(/<span aria-hidden="true" class="hl-mark">\?<\/span>/)
  })

  it('keeps the deferred slots deferred — no search, no language toggle', () => {
    expect(header).not.toContain('Search')
    expect(header).not.toContain('aria-label="Language"')
  })

  it('does not render the shortcut sheet until it is opened', () => {
    // Radix mounts the portal on open, so the closed sheet ships no table and
    // the prerendered header carries no route-derived link (§12.2).
    expect(header).not.toContain('hl-keys')
    expect(header).not.toContain('hl-dialog')
  })

  it('renders no pending state before a key has been pressed', () => {
    expect(header).not.toContain('hl-pending')
  })
})

describe('Readout — the honest empty first frame (§7.1, §12.2)', () => {
  const compact = renderToStaticMarkup(<Readout variant="compact" facts={FACTS} />)
  const full = renderToStaticMarkup(<Readout variant="full" facts={FACTS} traces={9} />)

  it('says it has not been filled in yet', () => {
    for (const markup of [compact, full]) {
      expect(markup).toContain('data-hydrated="false"')
      expect(markup).toContain('class="hl-readout')
    }
  })

  it('prints -- for every value it cannot know, and never a made-up number', () => {
    expect(values(compact)).toEqual(['--/32', '--', '--', '--'])
    expect(values(full)).toEqual(['--/32', '--', '--/32', '--', '--', '--', '--'])
  })

  it('keeps the denominators, which are build-time facts and are true', () => {
    // §12.2 — counts degrade honestly: the set is 32 sheets whoever is reading.
    expect(compact).toContain('--/32')
    expect(compact).not.toContain('/15')
  })

  it('never prints a percentage, in either variant (§11.35, §12.5.7)', () => {
    for (const markup of [compact, full]) expect(markup).not.toContain('%')
  })

  it('carries the CLASS threshold cell even with nothing to report (§7.1)', () => {
    // The label is dashed with the value: pre-hydration the next threshold is
    // as unknown as the numeral, and the cell count stays stable across the
    // hydration boundary so the strip does not reflow when the record arrives.
    for (const markup of [compact, full]) expect(markup).toContain('-- at')
  })
})

describe('Readout — the two variants (§5.2, §7.1, §12.5.2)', () => {
  const compact = renderToStaticMarkup(<Readout variant="compact" facts={FACTS} />)
  const full = renderToStaticMarkup(<Readout variant="full" facts={FACTS} traces={9} />)

  it('gives the footer §7.1s three values and the threshold, and nothing else', () => {
    expect(compact).toContain('data-variant="compact"')
    expect(compact).toContain('Signed off')
    expect(compact).toContain('XP')
    expect(compact).toContain('Class')
    expect(compact).not.toContain('To go')
    expect(compact).not.toContain('Uptime')
    expect(compact).not.toContain('Traces')
  })

  it('gives the dashboard the whole strip in §12.5.2s order', () => {
    const order = ['Signed off', 'To go', 'Traces', 'Uptime', 'XP', 'Class']
    const positions = order.map((label) => full.indexOf(label))
    expect(positions.every((at) => at >= 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })

  it('gives TO GO the ink weight, and only TO GO (§12.5.2)', () => {
    expect(full.match(/hl-readout-togo/g)).toHaveLength(1)
    expect(compact).not.toContain('hl-readout-togo')
    // The pre-hydration rule keys off `.hl-readout-value`, so the dashed
    // to-go count has to carry both classes or it would print in full ink
    // before anything had been read.
    expect(full).toContain('class="hl-readout-value hl-readout-togo"')
  })

  it('drops TRACES entirely where the numerator was never counted (§11.25)', () => {
    const noTraces = renderToStaticMarkup(<Readout variant="full" facts={FACTS} />)
    expect(noTraces).not.toContain('Traces')
    expect(noTraces).toContain('Uptime')
  })

  it('spends §7.1s painted rules on the dashboard strip only', () => {
    // §5.2's footer row has the footer's own rule above it already.
    expect(compact).toContain('bg-none')
    expect(full).not.toContain('bg-none')
  })
})

describe('the footer carries the compact readout (§5.2)', () => {
  it('prints whatever node it is handed, in row 1', () => {
    const markup = renderToStaticMarkup(
      <SiteFooter sheet="SHEET 13 OF 32" readout={<Readout variant="compact" facts={FACTS} />} />,
    )
    expect(markup).toContain('hl-readout')
    expect(markup).toContain('--/32')
  })

  it('is a footer with no readout at all when none is passed', () => {
    const markup = renderToStaticMarkup(<SiteFooter sheet="INDEX SHEET" />)
    expect(markup).not.toContain('hl-readout')
    expect(markup).toContain('Drawn by LKM-01')
  })
})

/**
 * §12.2 channel A — the two maps `layout.tsx` measures and hands the boot
 * script factory. What can be wrong here is silent and structural: keying the
 * totals by a category's *title*, or the modules by their number instead of
 * their slug, produces a script that runs cleanly and stamps nothing.
 *
 * First-paint correctness itself is Playwright's (§12.14.2): seed storage with
 * `addInitScript`, reload, and read the classes off `<html>`.
 */
describe('the boot script gets the maps it reads (§12.2)', () => {
  const facts = curriculumFacts()
  const totals = Object.fromEntries(facts.categories.map((c) => [c.slug, c.total]))
  const modules = Object.fromEntries(facts.sheets.map((s) => [s.slug, s.module]))

  it('keys the category totals by slug, which is what the script splits out of one', () => {
    // The script reads the category off the slug's own first segment, so the
    // two maps have to agree about what a category is called.
    for (const sheet of facts.sheets) expect(totals[sheet.category], sheet.slug).toBeGreaterThan(0)
    expect(Object.keys(totals)).toContain('fundamentals')
  })

  it('keys the module numbers by slug — never the other way round (§12.1.3)', () => {
    for (const [slug, module] of Object.entries(modules)) {
      expect(slug, slug).toContain('/')
      expect(Number.isInteger(module), slug).toBe(true)
    }
    expect(Object.keys(modules)).toHaveLength(facts.sheets.length)
  })

  it('stamps a signed-off sheet, its subsystem and the storage state', () => {
    // A subsystem with more than one sheet, so one sign-off is `started` and
    // the `-complete` branch is not what is being measured here.
    const sheet = facts.sheets.find((s) => s.drawn && totals[s.category] > 1)!
    const stored = JSON.stringify({
      schema: 1,
      savedAt: '2026-08-31T09:00:00.000Z',
      data: { sheets: { [sheet.slug]: { signedOff: '2026-08-31T09:00:00.000Z' } } },
    })

    const classes = new Set<string>()
    const attributes = new Map<string, string>()
    new Function(
      'window',
      'document',
      recordBootScript(totals, modules),
    )(
      { localStorage: { getItem: () => stored } },
      {
        documentElement: {
          classList: { add: (token: string) => classes.add(token) },
          setAttribute: (name: string, value: string) => attributes.set(name, value),
        },
      },
    )

    expect(classes).toContain(`hl-signed-${sheet.module}`)
    expect(classes).toContain(`hl-cat-${sheet.category}-started`)
    expect(attributes.get('data-hl-storage')).toBe('ok')
    expect(attributes.get('data-hl-record')).toBe('1')
  })
})

describe('PageShell wires the readout on every route (§7.1)', () => {
  // It measures the real corpus, which is the point: the denominators in the
  // footer are the drawing set's own, derived at build time and never typed.
  const markup = renderToStaticMarkup(<PageShell>{null}</PageShell>)

  it('still owns <main> and the footer', () => {
    expect(markup).toContain('id="main"')
    expect(markup).toContain('role="contentinfo"')
  })

})
