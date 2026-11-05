/**
 * The SVG profile every diagram file in the content bundle meets, defined once
 * and imported by `scripts/finalize-bundle.mjs`, which strips and checks, and
 * by `scripts/check-bundle-out.mjs`, which checks again (spec 2.9.4).
 *
 * **Why a profile at all.** The native reader draws with `flutter_svg`, which
 * ignores `<style>`, `<marker>`, `<filter>`, `<foreignObject>`, `var(` and the
 * baseline attributes, and drops what it does not support WITHOUT an error
 * (spec 2.3). An SVG that leaned on any of them would ship and draw wrong with
 * nothing failing, so every file is held to a closed list of elements and
 * attributes instead, and the build stops on anything outside it.
 *
 * **Why the strip is a named list and not "everything off the allow-list".**
 * Mermaid adds attributes that do not paint (accessibility, interaction,
 * bookkeeping), and those are removed by name below. A painting attribute that
 * is not on the allow-list (`clip-path`, `mask`, `fill-rule` and `xml:space`
 * all occur in the mermaid bundle) is NOT stripped: dropping it would misdraw
 * with no error, so it stays, fails the profile, and goes to the owner. The
 * allow-list grows only here, with a reason, and never to get a build through.
 *
 * Tokenised with two regular expressions rather than a parser, because the
 * scripts import only `node:`, packages and `scripts/lib/`, and the input is
 * serialised XML from one known producer. Anything the tokeniser cannot read
 * (an unmatched `<`) is itself a violation rather than something skipped.
 */

/** Spec 2.9.4's elements: shapes, text, grouping and linear gradients. */
export const ALLOWED_ELEMENTS = Object.freeze([
  'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline',
  'text', 'tspan', 'defs', 'linearGradient', 'stop',
])

/** Spec 2.9.4's attributes, each with why the reader needs it. */
export const ALLOWED_ATTRIBUTES = Object.freeze({
  xmlns: 'The SVG namespace on the root; without it the file is not SVG.',
  viewBox: 'The drawing\'s coordinate box; the reader scales the diagram by it.',
  width: 'Intrinsic size of the root, and the size of a rect.',
  height: 'Intrinsic size of the root, and the size of a rect.',
  id: 'The target of a gradient reference.',
  transform: 'Positions groups, text and the expanded markers.',
  d: 'A path\'s geometry.',
  x: 'Position of a rect, text or tspan.',
  y: 'Position of a rect, text or tspan.',
  x1: 'A line\'s or gradient vector\'s start.',
  y1: 'A line\'s or gradient vector\'s start.',
  x2: 'A line\'s or gradient vector\'s end.',
  y2: 'A line\'s or gradient vector\'s end.',
  cx: 'A circle\'s or ellipse\'s centre.',
  cy: 'A circle\'s or ellipse\'s centre.',
  r: 'A circle\'s radius.',
  rx: 'An ellipse\'s radius, or a rect\'s corner rounding.',
  ry: 'An ellipse\'s radius, or a rect\'s corner rounding.',
  points: 'A polygon\'s or polyline\'s geometry.',
  fill: 'The computed fill, written as an attribute by the flattener.',
  stroke: 'The computed stroke, written as an attribute by the flattener.',
  'stroke-width': 'The computed stroke width.',
  opacity: 'The computed opacity.',
  'fill-opacity': 'The computed fill opacity.',
  'stroke-opacity': 'The computed stroke opacity.',
  'stroke-dasharray': 'A dashed edge, which mermaid uses for dotted links.',
  'stroke-linecap': 'The computed line cap.',
  'stroke-linejoin': 'The computed line join.',
  display: 'An element the stylesheet hides stays hidden.',
  visibility: 'An element the stylesheet hides stays hidden.',
  'font-family': 'The face the labels were measured in.',
  'font-size': 'The size the labels were measured at.',
  'font-weight': 'The computed weight of a label.',
  'font-style': 'The computed style of a label.',
  'text-anchor': 'Labels are rewritten to an absolute x with text-anchor="middle".',
  offset: 'A gradient stop\'s position.',
  'stop-color': 'A gradient stop\'s colour.',
  'stop-opacity': 'A gradient stop\'s opacity.',
  gradientUnits: 'The coordinate system of a gradient vector.',
  gradientTransform: 'A transformed gradient vector.',
})

/** Strings that must not occur anywhere in a diagram file (spec 2.9.4). */
export const FORBIDDEN_STRINGS = Object.freeze([
  '<style',
  '<marker',
  '<foreignObject',
  '<filter',
  'var(',
  'class=',
  'style=',
  'dominant-baseline',
  'alignment-baseline',
])

/** Elements the finaliser removes with their content, because they do not paint. */
export const STRIPPED_ELEMENTS = Object.freeze({
  style: 'Spec 2.9.4: its effect is written onto each element as attributes first.',
  filter: 'Spec 2.9.4: the reader ignores filters, so a drop shadow is not drawn.',
  title: 'The accessible name only; the bundle\'s figure caption carries the title.',
  desc: 'The accessible description only; it never paints.',
})

/**
 * Attributes the finaliser removes, because they do not paint. A name ending in
 * `*` is a prefix.
 */
export const STRIPPED_ATTRIBUTES = Object.freeze({
  class: 'Spec 2.9.4: what the stylesheet painted through it is written as attributes first.',
  style: 'Spec 2.9.4: computed onto attributes first.',
  'dominant-baseline': 'Spec 2.9.4: folded into an absolute y first.',
  'alignment-baseline': 'Spec 2.9.4: folded into an absolute y first.',
  dx: 'Folded into the absolute x first.',
  dy: 'Folded into the absolute y first.',
  role: 'Accessibility, never paint.',
  tabindex: 'Interaction, never paint.',
  cursor: 'Interaction, never paint.',
  'pointer-events': 'Interaction, never paint.',
  'aria-*': 'Accessibility, never paint.',
  'data-*': 'Mermaid\'s bookkeeping (data-look, data-id, data-et), never paint.',
  'xmlns:xlink': 'No allowed attribute uses the xlink namespace.',
})

/** One start, end or self-closing tag, with its attributes captured whole. */
const TAG = /<(\/?)([A-Za-z][\w:.-]*)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/y
const ATTRIBUTE = /\s+([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)')/g
/** What may precede the root: an XML declaration, a comment, whitespace. */
const PROLOGUE = /<\?[\s\S]*?\?>|<!--[\s\S]*?-->/y

/**
 * Whether the SVG carries a forbidden string. One ending in `=` (`class=`,
 * `style=`) is an attribute, and matches only where an attribute name starts,
 * after whitespace: `font-style=` is on the allow-list, and a plain substring
 * test refused every label the finaliser writes it on.
 *
 * @param {string} svg
 * @param {string} forbidden
 */
function carries(svg, forbidden) {
  if (!forbidden.endsWith('=')) return svg.includes(forbidden)
  return new RegExp(`\\s${forbidden.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')}`).test(svg)
}

function isStrippedAttribute(name) {
  if (Object.hasOwn(STRIPPED_ATTRIBUTES, name)) return true
  return Object.keys(STRIPPED_ATTRIBUTES).some(
    (entry) => entry.endsWith('*') && name.startsWith(entry.slice(0, -1)),
  )
}

/**
 * Every tag in document order, or the offset of the first `<` that opens none.
 *
 * @param {string} svg
 */
function tokenize(svg) {
  const tags = []
  let at = 0
  while (true) {
    const open = svg.indexOf('<', at)
    if (open === -1) return { tags, unmatched: null }
    PROLOGUE.lastIndex = open
    const prologue = PROLOGUE.exec(svg)
    if (prologue) {
      at = PROLOGUE.lastIndex
      continue
    }
    TAG.lastIndex = open
    const match = TAG.exec(svg)
    if (!match) return { tags, unmatched: open }
    const attributes = [...match[3].matchAll(ATTRIBUTE)].map((one) => ({
      raw: one[0],
      name: one[1],
      value: one[3] ?? one[4],
    }))
    tags.push({
      start: open,
      end: TAG.lastIndex,
      closing: match[1] === '/',
      name: match[2],
      attributes,
      selfClosing: match[4] === '/',
    })
    at = TAG.lastIndex
  }
}

/**
 * The SVG without `STRIPPED_ELEMENTS` (and everything inside them) and without
 * `STRIPPED_ATTRIBUTES`. Text and every kept attribute are left byte for byte.
 *
 * @param {string} svg
 * @returns {string}
 */
export function stripNonPainting(svg) {
  const { tags, unmatched } = tokenize(svg)
  if (unmatched !== null) throw new Error(`svg-profile: unmatched < at offset ${unmatched}`)

  let out = ''
  let at = 0
  /** The stripped element whose content is being skipped, and its depth. */
  let skipping = null
  let depth = 0

  for (const tag of tags) {
    if (skipping !== null) {
      if (tag.name === skipping && !tag.selfClosing) depth += tag.closing ? -1 : 1
      if (depth === 0) {
        skipping = null
        at = tag.end
      }
      continue
    }

    out += svg.slice(at, tag.start)
    at = tag.end

    if (Object.hasOwn(STRIPPED_ELEMENTS, tag.name)) {
      if (tag.closing) throw new Error(`svg-profile: </${tag.name}> closes nothing`)
      if (!tag.selfClosing) {
        skipping = tag.name
        depth = 1
      }
      continue
    }

    if (tag.closing) {
      out += `</${tag.name}>`
      continue
    }
    const kept = tag.attributes
      .filter((attribute) => !isStrippedAttribute(attribute.name))
      .map((attribute) => attribute.raw)
      .join('')
    out += `<${tag.name}${kept}${tag.selfClosing ? '/' : ''}>`
  }
  if (skipping !== null) throw new Error(`svg-profile: <${skipping}> is never closed`)
  return out + svg.slice(at)
}

/**
 * Every way the SVG breaks the profile, one message each; empty means it
 * conforms.
 *
 * @param {string} svg
 * @returns {string[]}
 */
export function profileViolations(svg) {
  const violations = []

  for (const forbidden of FORBIDDEN_STRINGS) {
    if (carries(svg, forbidden)) violations.push(`forbidden string "${forbidden}"`)
  }

  const { tags, unmatched } = tokenize(svg)
  if (unmatched !== null) violations.push(`unmatched < at offset ${unmatched}`)

  const root = tags.find((tag) => !tag.closing)
  if (!root || root.name !== 'svg') {
    violations.push('the root element is not <svg>')
  } else if (!root.attributes.some((attribute) => attribute.name === 'viewBox')) {
    violations.push('the root <svg> has no viewBox')
  }

  const gradients = new Set(
    tags
      .filter((tag) => tag.name === 'linearGradient' && !tag.closing)
      .flatMap((tag) => tag.attributes.filter((one) => one.name === 'id').map((one) => one.value)),
  )

  for (const tag of tags) {
    if (tag.closing) continue
    if (!ALLOWED_ELEMENTS.includes(tag.name)) violations.push(`element <${tag.name}> is not in the profile`)
    for (const { name, value } of tag.attributes) {
      if (!Object.hasOwn(ALLOWED_ATTRIBUTES, name)) {
        violations.push(`attribute ${name} on <${tag.name}> is not in the profile`)
      }
      for (const reference of value.matchAll(/url\(\s*['"]?#([^)'"\s]+)['"]?\s*\)/g)) {
        if ((name !== 'fill' && name !== 'stroke') || !gradients.has(reference[1])) {
          violations.push(
            `${name}="${value}" on <${tag.name}>: url(#${reference[1]}) is allowed only in fill or stroke, naming a linearGradient`,
          )
        }
      }
    }
  }

  return violations
}
