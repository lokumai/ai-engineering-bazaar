import { describe, expect, it } from 'vitest'
import { flattenMarkers } from '../../../scripts/lib/flatten-markers.mjs'

/**
 * Arrowheads drawn as ordinary paths, because `flutter_svg` ignores `<marker>`
 * (spec 2.3, 2.9.4). Every SVG here is synthetic.
 */

interface MarkerOptions {
  orient?: string
  units?: string
  viewBox?: string
  size?: string
  aspect?: string
}

function marker({ orient = 'auto', units, viewBox, size, aspect }: MarkerOptions = {}): string {
  const attributes = [
    'id="arrow"',
    `orient="${orient}"`,
    'refX="5"',
    'refY="5"',
    units === undefined ? '' : `markerUnits="${units}"`,
    viewBox === undefined ? '' : `viewBox="${viewBox}"`,
    size === undefined ? '' : `markerWidth="${size}" markerHeight="${size}"`,
    aspect === undefined ? '' : `preserveAspectRatio="${aspect}"`,
  ].filter(Boolean).join(' ')
  return `<marker ${attributes}><path d="M0 0 L10 5 L0 10 Z" fill="#000000"/></marker>`
}

function drawing(options: MarkerOptions = {}, edge = '<path d="M0 0 L10 0" stroke-width="2" marker-end="url(#arrow)"/>'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><defs>${marker(options)}</defs>${edge}</svg>`
}

const pathCount = (svg: string) => (svg.match(/<path\b/g) ?? []).length

function expectFlattened(output: string): void {
  expect(output).not.toContain('<marker')
  expect(output).not.toMatch(/marker-(start|mid|end)/)
}

function transforms(output: string): string[] {
  return [...output.matchAll(/<g transform="([^"]*)">/g)].map((match) => match[1])
}

describe('flattenMarkers', () => {
  for (const orient of ['auto', 'auto-start-reverse', '45']) {
    it(`expands orient="${orient}" into a path`, () => {
      const input = drawing({ orient })
      const output = flattenMarkers(input)
      expectFlattened(output)
      // The edge itself, plus the marker's shape drawn once at the end.
      expect(pathCount(output)).toBe(2)
    })
  }

  it('turns an auto marker to the direction of the line', () => {
    const output = flattenMarkers(drawing({}, '<path d="M0 0 L0 10" stroke-width="1" marker-end="url(#arrow)"/>'))
    expect(transforms(output)).toEqual(['translate(0 10) rotate(90) scale(1) translate(-5 -5)'])
  })

  it('reverses auto-start-reverse at the start and not at the end', () => {
    const edge = '<path d="M0 0 L10 0" stroke-width="1" marker-start="url(#arrow)" marker-end="url(#arrow)"/>'
    const output = flattenMarkers(drawing({ orient: 'auto-start-reverse' }, edge))
    expect(transforms(output)).toEqual([
      'translate(0 0) rotate(180) scale(1) translate(-5 -5)',
      'translate(10 0) rotate(0) scale(1) translate(-5 -5)',
    ])
  })

  it('holds a numeric orient whatever the line does', () => {
    const output = flattenMarkers(drawing({ orient: '45' }, '<path d="M0 0 L0 10" stroke-width="1" marker-end="url(#arrow)"/>'))
    expect(transforms(output)).toEqual(['translate(0 10) rotate(45) scale(1) translate(-5 -5)'])
  })

  it('reads the end direction of a relative cubic curve', () => {
    const edge = '<path d="m0 0 c5 0 10 5 10 10" stroke-width="1" marker-end="url(#arrow)"/>'
    expect(transforms(flattenMarkers(drawing({}, edge)))).toEqual(['translate(10 10) rotate(90) scale(1) translate(-5 -5)'])
  })

  it('reads a line and a polyline', () => {
    const line = '<line x1="0" y1="0" x2="0" y2="-4" stroke-width="1" marker-end="url(#arrow)"/>'
    expect(transforms(flattenMarkers(drawing({}, line)))).toEqual(['translate(0 -4) rotate(-90) scale(1) translate(-5 -5)'])
    const polyline = '<polyline points="0,0 5,0 5,5" stroke-width="1" marker-end="url(#arrow)"/>'
    expect(transforms(flattenMarkers(drawing({}, polyline)))).toEqual(['translate(5 5) rotate(90) scale(1) translate(-5 -5)'])
  })

  it('refuses an arc, which it cannot read a direction from', () => {
    const edge = '<path d="M0 0 A5 5 0 0 1 10 0" stroke-width="1" marker-end="url(#arrow)"/>'
    expect(() => flattenMarkers(drawing({}, edge))).toThrow(/arc/)
  })

  it('refuses an orient it does not handle, naming it', () => {
    expect(() => flattenMarkers(drawing({ orient: 'foo' }))).toThrow(/foo/)
  })

  it('refuses a marker nobody defined', () => {
    const edge = '<path d="M0 0 L10 0" stroke-width="1" marker-end="url(#missing)"/>'
    expect(() => flattenMarkers(drawing({}, edge))).toThrow(/missing/)
  })

  describe('scales a userSpaceOnUse marker by its viewBox', () => {
    it('draws it at markerWidth over the viewBox width, ignoring the stroke', () => {
      const output = flattenMarkers(drawing({ units: 'userSpaceOnUse', viewBox: '0 0 10 10', size: '8' }))
      expect(transforms(output)).toEqual(['translate(10 0) rotate(0) scale(0.8) translate(-5 -5)'])
    })

    it('multiplies by the stroke width for the default markerUnits', () => {
      const output = flattenMarkers(drawing({ viewBox: '0 0 10 10', size: '8' }))
      expect(transforms(output)).toEqual(['translate(10 0) rotate(0) scale(1.6) translate(-5 -5)'])
    })

    it('refuses a markerUnits value it does not know, naming the marker', () => {
      expect(() => flattenMarkers(drawing({ units: 'foo', viewBox: '0 0 10 10', size: '8' }))).toThrow(/arrow/)
    })

    it('refuses a preserveAspectRatio it does not draw, naming the marker', () => {
      expect(() => flattenMarkers(drawing({ viewBox: '0 0 10 10', size: '8', aspect: 'none' }))).toThrow(/arrow/)
    })

    it('accepts preserveAspectRatio="xMidYMid meet", which is the default', () => {
      const output = flattenMarkers(drawing({ viewBox: '0 0 10 10', size: '8', aspect: 'xMidYMid meet' }))
      expect(transforms(output)).toEqual(['translate(10 0) rotate(0) scale(1.6) translate(-5 -5)'])
    })
  })
})
