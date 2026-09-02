import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  BLANK_READING_MESSAGE,
  Register,
  RegisterRow,
} from '@/components/record/Register'

/**
 * §16.4.1 — the one rule a collapsible register has to obey: **a closed row may
 * not hide a reading.** Folding removes prose; it never removes a fact.
 *
 * `renderToStaticMarkup` and nothing else, following
 * `tests/unit/components/record-profile.test.tsx:21-42`: there is no jsdom and
 * no Testing Library in this suite, so a disclosure cannot be driven here. That
 * is not a limitation for this file — it is the point. The property being
 * pinned is what the **closed** row says, and the static export is the closed
 * row: `<details>` ships without `open`, so the markup this test reads is
 * byte-for-byte what a reader receives before touching anything. Opening a row
 * is a browser act and belongs to Playwright (§16.8 gate 4).
 *
 * The guard in the fourth block is a mutation test in the sense §16.8 asks
 * for: an implementation that accepted an empty reading, or that dropped the
 * reading from the summary and kept it in the body, has to fail here.
 */

/** Rendered text alone; attribute values are not copy (§12.14.1). */
function text(markup: string): string {
  return markup
    .replace(/<!--.*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Just the `<summary>`, so "the reading is on the closed line" cannot be
 * satisfied by a reading that is actually sitting in the body. Non-greedy to
 * the first close tag: nothing legal nests a second `</summary>` inside one.
 */
function summaryOf(markup: string): string {
  const match = /<summary[\s\S]*?<\/summary>/.exec(markup)
  if (match === null) throw new Error('no <summary> in the rendered row')
  return match[0]
}

const ROW = renderToStaticMarkup(
  <RegisterRow id="storage" name="Storage" reading="PERSISTENT · QUERIED">
    <p>How this browser answered the persistence question.</p>
  </RegisterRow>,
)

const REGISTER = renderToStaticMarkup(
  <Register labelledBy="register-head">
    <RegisterRow id="stamps" name="Stamps" reading="2 OF 9 EARNED">
      <p>The shelf.</p>
    </RegisterRow>
    <RegisterRow id="raw" name="Stored values" reading="--">
      <p>Every key this origin holds.</p>
    </RegisterRow>
  </Register>,
)

describe('§16.4 — a register row arrives closed', () => {
  it('renders a native <details> with no `open` attribute', () => {
    expect(ROW).toContain('<details')
    // MEASURED: React serialises a boolean attribute as `open=""`, so the
    // pattern has to admit `=` after the name. Written as `\sopen[\s>]` first,
    // this assertion passed against a deliberately `<details open>` row.
    expect(ROW).not.toMatch(/<details[^>]*\sopen(?:=|\s|>)/)
  })

  it('hand-rolls no disclosure: no aria-expanded, no role=button', () => {
    expect(ROW).not.toContain('aria-expanded')
    expect(ROW).not.toContain('role="button"')
  })

  it('never hides the body in TSX — no `hidden`, no inline display:none', () => {
    // §16.4.4 and §12.10.3: the body is in the document while the row is
    // closed. `<details>` is what makes it inert; a `hidden` attribute or an
    // inline `display: none` would make it unfindable to in-page search and
    // would survive the print rule that forces every row open.
    expect(ROW).not.toMatch(/\shidden[\s=>]/)
    expect(ROW).not.toMatch(/display:\s*none/)
    expect(text(ROW)).toContain('How this browser answered the persistence question.')
  })
})

describe('§16.4.1 — the closed line states the reading', () => {
  it('prints the row name and its reading in the summary itself', () => {
    const summary = text(summaryOf(ROW))
    expect(summary).toContain('Storage')
    expect(summary).toContain('PERSISTENT · QUERIED')
  })

  it('accepts `--` as a reading: no reading taken yet is a reading', () => {
    const rows = REGISTER.split('<section').filter((part) => part.includes('id="raw"'))
    expect(rows).toHaveLength(1)
    expect(text(summaryOf(rows[0]))).toContain('--')
  })

  it('keeps the chevron out of the accessible name', () => {
    // The `›` replaces the native triangle, which is not in ISO 128's line
    // language (§16.4.4). It is decoration: the state a screen reader needs
    // comes from `<details>` itself.
    expect(summaryOf(ROW)).toContain('aria-hidden="true"')
  })
})

describe('§16.4.1 — the mutation guard', () => {
  const blank = ['', ' ', '\n', null, undefined, false] as const

  for (const reading of blank) {
    it(`refuses to render a row whose reading is ${JSON.stringify(reading)}`, () => {
      expect(() =>
        renderToStaticMarkup(
          <RegisterRow id="uptime" name="Uptime" reading={reading}>
            <p>body</p>
          </RegisterRow>,
        ),
      ).toThrow(BLANK_READING_MESSAGE)
    })
  }

  it('states in the failure what the caller is meant to pass instead', () => {
    // A guard whose message does not name the escape hatch gets worked around
    // with an empty string and a shrug.
    expect(BLANK_READING_MESSAGE).toContain('--')
  })
})

describe('§16.7 — the register and its rows are named', () => {
  it('wires the register to the heading id it is given', () => {
    expect(REGISTER).toContain('aria-labelledby="register-head"')
  })

  it('keeps each row an aria-labelledby section, so a deleted panel id resolves', () => {
    // Hazard 2: roughly twenty assertions address these panels as
    // `section[aria-labelledby="raw"]`, and `/profile/` is the target of
    // in-tree links. The id moves inside the `<summary>`; it does not change,
    // and neither does the section that borrows it as a name.
    expect(REGISTER).toContain('<section class="hl-register-row" aria-labelledby="stamps">')
    expect(REGISTER).toContain('<section class="hl-register-row" aria-labelledby="raw">')
  })

  it('carries the row id on an h2, at the heading level the panel had', () => {
    expect(ROW).toMatch(/<h2[^>]*id="storage"/)
    // One h2 per row and no h3 smuggled in beside it: §16.7 fixes the page at
    // one h1, h2 for the blocks, h3 for the drafter block's two halves.
    expect((ROW.match(/<h2/g) ?? []).length).toBe(1)
  })

  it('renders the rows in the order it was given them', () => {
    expect(REGISTER.indexOf('id="stamps"')).toBeLessThan(REGISTER.indexOf('id="raw"'))
  })
})
