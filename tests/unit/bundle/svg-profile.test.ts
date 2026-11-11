import { describe, expect, it } from 'vitest'
import {
  ALLOWED_ATTRIBUTES,
  ALLOWED_ELEMENTS,
  FORBIDDEN_STRINGS,
  STRIPPED_ATTRIBUTES,
  STRIPPED_ELEMENTS,
  profileViolations,
  stripNonPainting,
} from '../../../scripts/lib/svg-profile.mjs'

/**
 * The SVG profile a diagram file must meet, because `flutter_svg` drops what it
 * does not support without an error (spec 2.3, 2.9.4). Every SVG here is
 * synthetic.
 */

const svg = (body: string, root = 'viewBox="0 0 10 10"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${root}>${body}</svg>`

const CONFORMING = svg(
  '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0">'
  + '<stop offset="0" stop-color="#000000"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs>'
  + '<g transform="translate(1 1)"><rect x="0" y="0" width="4" height="4" fill="url(#g)" stroke="#123456"/>'
  + '<text x="5" y="5" font-family="Vazirmatn" font-size="12" text-anchor="middle">A</text></g>',
)

/** One SVG that carries each forbidden string, and nothing else wrong that names it. */
const CARRIES: Record<string, string> = {
  '<style': svg('<style>rect{}</style>'),
  '<marker': svg('<defs><marker id="m"></marker></defs>'),
  '<foreignObject': svg('<foreignObject x="0" y="0"></foreignObject>'),
  '<filter': svg('<defs><filter id="f"></filter></defs>'),
  'var(': svg('<rect fill="var(--x)"/>'),
  'class=': svg('<rect class="node"/>'),
  'style=': svg('<rect style="fill:red"/>'),
  'dominant-baseline': svg('<text dominant-baseline="middle">A</text>'),
  'alignment-baseline': svg('<text alignment-baseline="middle">A</text>'),
}

describe('the profile, as data', () => {
  it('gives every attribute it allows a reason', () => {
    for (const [name, reason] of Object.entries(ALLOWED_ATTRIBUTES)) {
      expect(typeof reason, name).toBe('string')
      expect((reason as string).length, name).toBeGreaterThan(0)
    }
  })

  it('gives every stripped element and attribute a reason', () => {
    for (const [name, reason] of [...Object.entries(STRIPPED_ELEMENTS), ...Object.entries(STRIPPED_ATTRIBUTES)]) {
      expect(typeof reason, name).toBe('string')
      expect((reason as string).length, name).toBeGreaterThan(0)
    }
  })

  it('names the elements spec 2.9.4 allows', () => {
    expect([...ALLOWED_ELEMENTS].sort()).toEqual(
      'svg g path rect circle ellipse line polygon polyline text tspan defs linearGradient stop'.split(' ').sort(),
    )
  })

  it('has a case below for every forbidden string', () => {
    expect([...FORBIDDEN_STRINGS].sort()).toEqual(Object.keys(CARRIES).sort())
  })
})

describe('profileViolations', () => {
  it('passes a conforming SVG with a gradient', () => {
    expect(profileViolations(CONFORMING)).toEqual([])
  })

  // `font-style` is on the allow-list and its name ends in `style=`: the
  // forbidden `style=` and `class=` are attributes, not substrings of one.
  it('accepts font-style, whose name ends in a forbidden attribute', () => {
    expect(profileViolations(svg('<text x="1" y="1" font-style="normal">A</text>'))).toEqual([])
  })

  it('accepts escaped entities', () => {
    expect(profileViolations(svg('<text x="1" y="1">A &amp; B &lt; C &quot;D&quot;</text>'))).toEqual([])
  })

  // XML escapes only `<`, `&` and quotes, so a label about CSS or HTML reaches
  // a <text> node verbatim; it is drawn as text and is not markup.
  it('accepts a forbidden string in a label\'s text', () => {
    const label = 'set var(--x), a class=foo, a style=bar and dominant-baseline or alignment-baseline'
    expect(profileViolations(svg(`<text x="1" y="1">${label}</text>`))).toEqual([])
  })

  for (const [forbidden, input] of Object.entries(CARRIES)) {
    it(`refuses ${forbidden}`, () => {
      const violations = profileViolations(input)
      expect(violations.some((message: string) => message.includes(`forbidden string "${forbidden}"`)), violations.join('\n'))
        .toBe(true)
    })
  }

  for (const element of ['foreignObject', 'marker', 'image']) {
    it(`refuses a <${element}> element`, () => {
      const violations = profileViolations(svg(`<${element} x="0"/>`))
      expect(violations.some((message: string) => message.includes(`element <${element}>`)), violations.join('\n'))
        .toBe(true)
    })
  }

  it('refuses an attribute off the list', () => {
    const violations = profileViolations(svg('<path d="M0 0" clip-path="url(#c)"/>'))
    expect(violations.some((message: string) => message.includes('attribute clip-path')), violations.join('\n'))
      .toBe(true)
  })

  it('refuses url(#) that names something other than a gradient', () => {
    const violations = profileViolations(svg('<defs><g id="shape"/></defs><rect fill="url(#shape)"/>'))
    expect(violations.some((message: string) => message.includes('url(#shape)')), violations.join('\n')).toBe(true)
  })

  it('refuses url(#) outside fill and stroke, even for a gradient', () => {
    const violations = profileViolations(
      svg('<defs><linearGradient id="g"/></defs><rect transform="url(#g)"/>'),
    )
    expect(violations.some((message: string) => message.includes('url(#g)')), violations.join('\n')).toBe(true)
  })

  it('refuses a root with no viewBox', () => {
    const violations = profileViolations(svg('<rect/>', 'width="10" height="10"'))
    expect(violations.some((message: string) => message.includes('viewBox')), violations.join('\n')).toBe(true)
  })

  it('refuses a <rect> with no area, which the reader would stroke as a dot', () => {
    for (const rect of ['<rect fill="#000000"/>', '<rect width="4"/>', '<rect height="4"/>', '<rect width="0" height="4"/>']) {
      const violations = profileViolations(svg(rect))
      expect(violations.some((message: string) => message.includes('no width or height')), rect).toBe(true)
    }
    expect(profileViolations(svg('<rect x="0" y="0" width="0.1" height="0.1"/>'))).toEqual([])
  })

  it('refuses a < that opens no tag', () => {
    const violations = profileViolations(svg('<text>1 < 2</text>'))
    expect(violations.some((message: string) => message.includes('unmatched <')), violations.join('\n')).toBe(true)
  })
})

describe('stripNonPainting', () => {
  const MERMAID_ROOT =
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
    + ' role="graphics-document document" aria-roledescription="flowchart-v2" style="max-width: 10px"'
    + ' data-look="classic" viewBox="0 0 10 10">'

  const mermaidShaped = (pathAttributes = '') =>
    MERMAID_ROOT
    + '<title>A flowchart</title><desc>What it shows</desc>'
    + `<g class="node" data-id="a" data-et="node"><path d="M0 0 L5 5" fill="#112233"${pathAttributes}/></g>`
    + '</svg>'

  it('strips what mermaid adds and keeps what paints', () => {
    const stripped = stripNonPainting(mermaidShaped())
    expect(profileViolations(stripped)).toEqual([])
    expect(stripped).toContain('d="M0 0 L5 5"')
    expect(stripped).toContain('fill="#112233"')
    expect(stripped).toContain('viewBox="0 0 10 10"')
    expect(stripped).not.toContain('A flowchart')
  })

  it('leaves a painting attribute off the list in place, so the profile stops it', () => {
    const violations = profileViolations(stripNonPainting(mermaidShaped(' clip-path="url(#c)"')))
    expect(violations.some((message: string) => message.includes('clip-path')), violations.join('\n')).toBe(true)
  })

  it('removes <style> and <filter> with their content', () => {
    const stripped = stripNonPainting(svg('<style>.a{fill:red}</style><defs><filter id="f"><feBlend/></filter></defs><rect/>'))
    expect(stripped).not.toMatch(/style|filter|feBlend|fill:red/)
    expect(profileViolations(stripped)).toEqual([])
  })

  it('removes a sequence diagram\'s icon symbols and its actor names, which never paint', () => {
    const stripped = stripNonPainting(svg(
      '<defs><symbol id="computer" width="24" height="24" fill-rule="evenodd" clip-rule="evenodd"><path d="M2 2h20v20H2z"/></symbol></defs>'
      + '<rect x="0" y="0" width="5" height="5" name="Agent" fill="#ffffff"/><line x1="0" y1="0" x2="5" y2="5" name="Agent" stroke="#000000"/>',
    ))
    expect(stripped).not.toMatch(/symbol|computer|name=/)
    expect(stripped).toContain('fill="#ffffff"')
    expect(profileViolations(stripped)).toEqual([])
  })

  it('still refuses a <use>, so a symbol that would have painted cannot vanish quietly', () => {
    const stripped = stripNonPainting(svg('<defs><symbol id="s"><path d="M0 0"/></symbol></defs><use href="#s"/>'))
    expect(profileViolations(stripped).some((message: string) => message.includes('<use>'))).toBe(true)
  })

  it('removes a <rect> with no area and keeps one that has one', () => {
    const stripped = stripNonPainting(svg(
      '<g><rect fill="#ececff" stroke="#9370db" stroke-width="1" visibility="visible"/>'
      + '<rect x="1" y="1" width="4" height="0"></rect><rect x="0" y="0" width="5" height="5" fill="#ffffff"/></g>',
    ))
    expect(stripped).toBe(svg('<g><rect x="0" y="0" width="5" height="5" fill="#ffffff"/></g>'))
    expect(profileViolations(stripped)).toEqual([])
  })

  it('leaves text content alone', () => {
    const input = svg('<text x="1" y="1" class="label">A &amp; B</text>')
    expect(stripNonPainting(input)).toContain('>A &amp; B</text>')
  })
})
