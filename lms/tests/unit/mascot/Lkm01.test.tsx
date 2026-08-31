import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Lkm01 } from '@/components/mascot/Lkm01'
import { FACES, SUGAR, type Lkm01Progress } from '@/components/mascot/geometry'

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

function facesOf(markup: string): Array<Record<string, string>> {
  return tagsOf(markup, 'path').filter((a) => a['data-face'])
}

function face(markup: string, id: string): Record<string, string> {
  const found = facesOf(markup).find((a) => a['data-face'] === id)
  if (!found) throw new Error(`no face ${id} in the rendered mark`)
  return found
}

/** A reading in which every one of the six subsystems is finished. */
const ALL_COMPLETE: Lkm01Progress = Object.fromEntries(
  FACES.map((f) => [f.category, { approved: 1, total: 1 }]),
)

/** One subsystem under way, four undrawn, one finished. */
const MIXED: Lkm01Progress = {
  fundamentals: { approved: 3, total: 7 },
  protocols: { approved: 1, total: 1 },
}

describe('Lkm01 — the mark itself', () => {
  const markup = renderToStaticMarkup(<Lkm01 />)

  it('draws on the 0 0 32 32 viewBox at the §8.3 header size', () => {
    const svg = tagsOf(markup, 'svg')[0]
    expect(svg.viewBox).toBe('0 0 32 32')
    expect(svg.width).toBe('28')
    expect(svg.height).toBe('28')
  })

  it('scales to any size on the same geometry', () => {
    const svg = tagsOf(renderToStaticMarkup(<Lkm01 size={96} />), 'svg')[0]
    expect(svg.width).toBe('96')
    expect(svg.viewBox).toBe('0 0 32 32')
  })

  it('draws all six faces, each named for the subsystem it meters', () => {
    const drawn = facesOf(markup)
    expect(drawn).toHaveLength(FACES.length)
    for (const f of FACES) expect(face(markup, f.id)['data-cat'], f.id).toBe(f.category)
    expect(face(markup, 'F1').d).toBe(FACES[0].path)
  })
})

/**
 * §12.2 — the whole guarantee of this slice's highest-risk change.
 *
 * The mark is channel A: the pre-paint boot script stamps `<html>` and
 * `record.css` draws the faces. If the markup varied with the reading, the
 * prerendered header and the hydrated header would disagree structurally, and
 * React 19 answers that by discarding and re-rendering the subtree — a logged
 * recoverable error and a visible repaint of the header on every load.
 */
describe('state independence — §12.2', () => {
  it('emits byte-identical markup for no reading and for a finished set', () => {
    const empty = renderToStaticMarkup(<Lkm01 progress={0} />)
    const full = renderToStaticMarkup(<Lkm01 progress={ALL_COMPLETE} />)
    const mixed = renderToStaticMarkup(<Lkm01 progress={MIXED} />)
    const omitted = renderToStaticMarkup(<Lkm01 />)

    expect(full).toBe(empty)
    expect(mixed).toBe(empty)
    expect(omitted).toBe(empty)
  })

  it('is aria-hidden in every state, and names no progress to anybody', () => {
    for (const progress of [0, MIXED, ALL_COMPLETE] as Lkm01Progress[]) {
      const markup = renderToStaticMarkup(<Lkm01 progress={progress} />)
      const svg = tagsOf(markup, 'svg')[0]
      expect(svg['aria-hidden']).toBe('true')
      expect(svg.role).toBeUndefined()
      expect(svg['aria-label']).toBeUndefined()
      expect(markup).not.toContain('Progress:')
    }
  })

  it('leaves both hatch patterns in place whatever the reader has signed off', () => {
    for (const progress of [0, ALL_COMPLETE] as Lkm01Progress[]) {
      const markup = renderToStaticMarkup(<Lkm01 progress={progress} />)
      expect(tagsOf(markup, 'pattern')).toHaveLength(2)
      expect(tagsOf(markup, 'path').filter((a) => a['data-hatch'])).toHaveLength(6)
    }
  })

  it('carries no state on the faces — every weight and colour is CSS (§12.2)', () => {
    for (const drawn of facesOf(renderToStaticMarkup(<Lkm01 progress={ALL_COMPLETE} />))) {
      expect(drawn.class).toBe('hl-face')
      expect(drawn.stroke, drawn['data-face']).toBeUndefined()
      expect(drawn['stroke-width'], drawn['data-face']).toBeUndefined()
      expect(drawn.fill, drawn['data-face']).toBe('none')
    }
  })

  it('hands every face and every hatch to record.css by class and category', () => {
    const markup = renderToStaticMarkup(<Lkm01 />)
    for (const f of FACES) {
      const hatch = tagsOf(markup, 'path').find((a) => a['data-hatch'] === f.id)
      expect(hatch?.class, f.id).toBe('hl-face-hatch')
      expect(hatch?.['data-cat'], f.id).toBe(f.category)
    }
  })
})

describe('line types — §8.1, §8.2', () => {
  const markup = renderToStaticMarkup(<Lkm01 />)

  it('paints the hidden faces first, so a solid edge is never overdrawn dashed', () => {
    // Every hexagon edge divides a visible face from a hidden one, so painting
    // the visible three last is what keeps the silhouette solid in every state.
    expect(facesOf(markup).map((a) => a['data-face'])).toEqual(['F4', 'F5', 'F6', 'F1', 'F2', 'F3'])
  })

  it('keeps a visible face solid and a hidden face dashed, in every state', () => {
    for (const progress of [0, MIXED, ALL_COMPLETE] as Lkm01Progress[]) {
      const drawing = renderToStaticMarkup(<Lkm01 progress={progress} />)
      for (const f of FACES) {
        const dash = face(drawing, f.id)['stroke-dasharray']
        expect(dash, f.id).toBe(f.visible ? undefined : '2 2')
      }
    }
  })
})

describe('hatching — §8.2', () => {
  const markup = renderToStaticMarkup(<Lkm01 />)

  it('fills each face from the pattern its visibility calls for, at 88%', () => {
    for (const f of FACES) {
      const hatch = tagsOf(markup, 'path').find((a) => a['data-hatch'] === f.id)!
      expect(hatch.d, f.id).toBe(f.path)
      expect(hatch.fill, f.id).toMatch(f.visible ? /-hatch-visible\)$/ : /-hatch-hidden\)$/)
      expect(hatch['fill-opacity'], f.id).toBe('0.88')
    }
  })

  it('opposes the two directions, +45° visible and −45° hidden', () => {
    expect(tagsOf(markup, 'pattern').map((p) => p.patternTransform))
      .toEqual(['rotate(45)', 'rotate(-45)'])
  })

  it('lays pitch 3, stroke 0.5 at header size', () => {
    const pattern = tagsOf(markup, 'pattern')[0]
    expect(pattern.patternUnits).toBe('userSpaceOnUse')
    expect(pattern.width).toBe('3')
    expect(pattern.height).toBe('3')
    expect(tagsOf(markup, 'line')[0]['stroke-width']).toBe('0.5')
  })

  it('opens the pitch to 4 and the stroke to 0.75 above 32px', () => {
    const big = renderToStaticMarkup(<Lkm01 size={96} />)
    expect(tagsOf(big, 'pattern')[0].width).toBe('4')
    expect(tagsOf(big, 'line')[0]['stroke-width']).toBe('0.75')
  })

  it('scopes its pattern ids so two marks on one page cannot collide', () => {
    const other = renderToStaticMarkup(<Lkm01 idPrefix="stamp" />)
    expect(tagsOf(other, 'pattern')[0].id).toContain('stamp')
    expect(tagsOf(other, 'pattern')[0].id).not.toBe(tagsOf(markup, 'pattern')[0].id)
  })

  it('scopes them by size too, because the pitch answers to the size', () => {
    // The 28px header mark and the 96px dashboard mark sit on one page in
    // §8.3's own table; with one id between them every reference would resolve
    // to whichever pattern came first.
    const big = renderToStaticMarkup(<Lkm01 size={96} />)
    expect(tagsOf(big, 'pattern')[0].id).not.toBe(tagsOf(markup, 'pattern')[0].id)
  })
})

describe('powdered sugar — §8.1', () => {
  const markup = renderToStaticMarkup(<Lkm01 />)

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
  it('paints every colour through a custom property, so a theme switch costs 0ms', () => {
    const markup = renderToStaticMarkup(<Lkm01 size={96} />)
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
    const states = [0, MIXED, ALL_COMPLETE] as Lkm01Progress[]
    for (const progress of states) {
      expect(renderToStaticMarkup(<Lkm01 progress={progress} />)).not.toMatch(HEX)
    }
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
