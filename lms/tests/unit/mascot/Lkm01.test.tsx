import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Lkm01 } from '@/components/mascot/Lkm01'
import { EDGES, FACES, SUGAR } from '@/components/mascot/geometry'

const MASCOT_SRC = path.resolve(process.cwd(), 'src', 'components', 'mascot')

/** A CSS hex colour: `#abc`, `#abcd`, `#aabbcc`, `#aabbccdd`. */
const HEX = /#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b/i

function tagsOf(markup: string, tag: string): Array<Record<string, string>> {
  const out: Array<Record<string, string>> = []
  for (const match of markup.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'g'))) {
    const attrs: Record<string, string> = {}
    for (const attr of match[1].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) attrs[attr[1]] = attr[2]
    out.push(attrs)
  }
  return out
}

function edge(markup: string, id: string): Record<string, string> {
  const found = tagsOf(markup, 'path').find((a) => a['data-edge'] === id)
  if (!found) throw new Error(`no edge ${id} in the rendered mark`)
  return found
}

/** The four edges that bound F1 TOP — the Fundamentals face. */
const F1_EDGES = ['T-R', 'C-R', 'C-L', 'L-T']

describe('Lkm01 — the mark itself', () => {
  const markup = renderToStaticMarkup(<Lkm01 progress={0} />)

  it('draws on the 0 0 32 32 viewBox at the §8.3 header size', () => {
    const svg = tagsOf(markup, 'svg')[0]
    expect(svg.viewBox).toBe('0 0 32 32')
    expect(svg.width).toBe('28')
    expect(svg.height).toBe('28')
  })

  it('names its state for a screen reader, in the §8.3 form', () => {
    const svg = tagsOf(
      renderToStaticMarkup(<Lkm01 progress={{ fundamentals: { approved: 1, total: 7 } }} />),
      'svg',
    )[0]
    expect(svg.role).toBe('img')
    expect(svg['aria-label']).toBe('Progress: 1 of 6 subsystems started')
  })

  it('claims no progress reading when there is no progress store (§1)', () => {
    // `progress={0}` means "nothing can record an approval yet", not "this
    // reader has approved nothing". Announcing an empty progress record would
    // tell a screen-reader user about a feature the site does not have, so the
    // untracked mark paints and stays out of the accessibility tree — the same
    // resolution §7.2 reaches for the inert task lists.
    const svg = tagsOf(markup, 'svg')[0]
    expect(svg['aria-hidden']).toBe('true')
    expect(svg.role).toBeUndefined()
    expect(svg['aria-label']).toBeUndefined()
    expect(markup).not.toContain('Progress:')
  })

  it('draws all twelve edges of the cube', () => {
    const drawn = tagsOf(markup, 'path')
      .filter((a) => a['data-edge'])
      .map((a) => a['data-edge'])
    expect(new Set(drawn)).toEqual(new Set(EDGES.map((e) => e.id)))
  })

  it('scales to any size on the same geometry', () => {
    const svg = tagsOf(renderToStaticMarkup(<Lkm01 progress={0} size={96} />), 'svg')[0]
    expect(svg.width).toBe('96')
    expect(svg.viewBox).toBe('0 0 32 32')
  })
})

describe('face states — §8.2', () => {
  const dormant = renderToStaticMarkup(<Lkm01 progress={0} />)
  const started = renderToStaticMarkup(
    <Lkm01 progress={{ fundamentals: { approved: 1, total: 7 } }} />,
  )
  const complete = renderToStaticMarkup(
    <Lkm01 progress={{ fundamentals: { approved: 7, total: 7 } }} />,
  )

  it('renders three genuinely different drawings', () => {
    expect(new Set([dormant, started, complete]).size).toBe(3)
  })

  it('draws a dormant face as a hairline in the decorative line weight', () => {
    for (const id of F1_EDGES) {
      expect(edge(dormant, id)['data-state'], id).toBe('dormant')
      expect(edge(dormant, id).stroke, id).toBe('var(--color-line)')
      expect(edge(dormant, id)['stroke-width'], id).toBe('var(--stroke-hair)')
    }
  })

  it('inks a started face at the structural weight', () => {
    for (const id of F1_EDGES) {
      expect(edge(started, id)['data-state'], id).toBe('started')
      expect(edge(started, id).stroke, id).toBe('var(--color-ink)')
      expect(edge(started, id)['stroke-width'], id).toBe('var(--stroke-struct)')
    }
  })

  it('energizes a complete face in the annotation pen', () => {
    for (const id of F1_EDGES) {
      expect(edge(complete, id)['data-state'], id).toBe('complete')
      expect(edge(complete, id).stroke, id).toBe('var(--color-accent)')
      expect(edge(complete, id)['stroke-width'], id).toBe('var(--stroke-struct)')
    }
  })

  it('leaves the other five faces exactly where they were', () => {
    // R-Rp bounds F3 and F5 — neither of which Fundamentals touches.
    expect(edge(started, 'R-Rp')['data-state']).toBe('dormant')
    expect(edge(complete, 'R-Rp')['data-state']).toBe('dormant')
  })

  it('gives a shared edge the higher of its two faces', () => {
    // C-L bounds F1 (complete) and F2 (dormant): the annotation pen wins.
    const mixed = renderToStaticMarkup(
      <Lkm01 progress={{ fundamentals: { approved: 7, total: 7 } }} />,
    )
    expect(edge(mixed, 'C-L')['data-state']).toBe('complete')
  })

  it('never changes an edge from solid to dashed, in any state', () => {
    const hidden = EDGES.filter((e) => e.kind === 'hidden-y').map((e) => e.id)
    for (const markup of [dormant, started, complete]) {
      for (const e of EDGES) {
        const dash = edge(markup, e.id)['stroke-dasharray']
        expect(dash, e.id).toBe(hidden.includes(e.id) ? '2 2' : undefined)
      }
    }
  })

  it('fills nothing until a category is finished', () => {
    for (const markup of [dormant, started]) {
      expect(markup).not.toContain('<pattern')
      expect(markup).not.toContain('url(#')
    }
  })
})

describe('hatching — §8.2', () => {
  const complete = renderToStaticMarkup(
    <Lkm01 progress={{ fundamentals: { approved: 7, total: 7 } }} />,
  )

  it('hatches the completed face at 88% in the annotation pen', () => {
    const f1 = FACES.find((f) => f.id === 'F1')!
    const face = tagsOf(complete, 'path').find((a) => a['data-face'] === 'F1')!
    expect(face.d).toBe(f1.path)
    expect(face.fill).toMatch(/^url\(#/)
    expect(face['fill-opacity']).toBe('0.88')
  })

  it('hatches only the faces that are finished', () => {
    const hatched = tagsOf(complete, 'path').filter((a) => a['data-face'])
    expect(hatched.map((a) => a['data-face'])).toEqual(['F1'])
  })

  it('lays a visible face at +45°, pitch 3, stroke 0.5 at header size', () => {
    const pattern = tagsOf(complete, 'pattern')[0]
    expect(pattern.patternUnits).toBe('userSpaceOnUse')
    expect(pattern.patternTransform).toBe('rotate(45)')
    expect(pattern.width).toBe('3')
    expect(pattern.height).toBe('3')
    expect(tagsOf(complete, 'line')[0]['stroke-width']).toBe('0.5')
  })

  it('opens the pitch to 4 and the stroke to 0.75 above 32px', () => {
    const big = renderToStaticMarkup(
      <Lkm01 progress={{ fundamentals: { approved: 7, total: 7 } }} size={96} />,
    )
    expect(tagsOf(big, 'pattern')[0].width).toBe('4')
    expect(tagsOf(big, 'line')[0]['stroke-width']).toBe('0.75')
  })

  it('opposes the hatch direction on a hidden face', () => {
    const back = renderToStaticMarkup(
      <Lkm01 progress={{ protocols: { approved: 1, total: 1 } }} />,
    )
    const pattern = tagsOf(back, 'pattern')[0]
    expect(pattern.patternTransform).toBe('rotate(-45)')
    // F5 BACK-RIGHT is hidden geometry: its own Y edges stay dashed while lit.
    expect(edge(back, 'C-T')['data-state']).toBe('complete')
    expect(edge(back, 'C-T')['stroke-dasharray']).toBe('2 2')
  })

  it('crosshatches the overlaps once the whole set is approved', () => {
    const all = Object.fromEntries(
      FACES.map((f) => [f.category, { approved: 1, total: 1 }]),
    )
    const full = renderToStaticMarkup(<Lkm01 progress={all} />)
    const directions = tagsOf(full, 'pattern').map((p) => p.patternTransform)
    expect(new Set(directions)).toEqual(new Set(['rotate(45)', 'rotate(-45)']))
    expect(tagsOf(full, 'path').filter((a) => a['data-face'])).toHaveLength(6)
  })

  it('scopes its pattern ids so two marks on one page cannot collide', () => {
    const other = renderToStaticMarkup(
      <Lkm01 progress={{ fundamentals: { approved: 7, total: 7 } }} idPrefix="stamp" />,
    )
    expect(tagsOf(other, 'pattern')[0].id).toContain('stamp')
    expect(tagsOf(other, 'pattern')[0].id).not.toBe(tagsOf(complete, 'pattern')[0].id)
  })
})

describe('powdered sugar — §8.1', () => {
  const markup = renderToStaticMarkup(<Lkm01 progress={0} />)

  it('stipples seven decorative dots on the top face', () => {
    const dots = tagsOf(markup, 'circle')
    expect(dots).toHaveLength(SUGAR.length)
    for (const dot of dots) {
      expect(dot.r).toBe('0.45')
      expect(dot.fill).toBe('var(--color-ink-faint)')
    }
  })

  it('hides them from assistive technology — they carry no information (T5)', () => {
    expect(markup).toMatch(/<g[^>]*aria-hidden="true"[^>]*>\s*<circle/)
  })
})

describe('re-theming', () => {
  it('paints every stroke and fill through a custom property, so a theme switch costs 0ms', () => {
    const markup = renderToStaticMarkup(
      <Lkm01 progress={{ fundamentals: { approved: 7, total: 7 } }} size={96} />,
    )
    const painted = [
      ...tagsOf(markup, 'path'),
      ...tagsOf(markup, 'circle'),
      ...tagsOf(markup, 'line'),
    ]
    expect(painted.length).toBeGreaterThan(0)
    for (const el of painted) {
      for (const key of ['stroke', 'fill']) {
        const value = el[key]
        if (!value || value === 'none') continue
        expect(value, `${key}="${value}"`).toMatch(/^(?:var\(--|url\(#)/)
      }
    }
  })

  it('renders no hex colour at any progress state', () => {
    const states = [
      renderToStaticMarkup(<Lkm01 progress={0} />),
      renderToStaticMarkup(<Lkm01 progress={{ fundamentals: { approved: 1, total: 7 } }} />),
      renderToStaticMarkup(<Lkm01 progress={{ fundamentals: { approved: 7, total: 7 } }} />),
    ]
    for (const markup of states) expect(markup).not.toMatch(HEX)
  })

  it('carries no hex colour anywhere in the component source', () => {
    const files = readdirSync(MASCOT_SRC)
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const source = readFileSync(path.join(MASCOT_SRC, file), 'utf8')
      expect(source.match(HEX)?.[0], file).toBeUndefined()
    }
  })
})
