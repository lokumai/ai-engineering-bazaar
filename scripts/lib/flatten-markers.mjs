/**
 * Arrowheads as ordinary shapes: every `<marker>` a diagram uses is drawn
 * where the browser would draw it, as a transformed copy of its content, and
 * then the markers are deleted (spec 2.9.4).
 *
 * **Why.** `flutter_svg` ignores `<marker>` and says nothing (spec 2.3), so a
 * flowchart would reach the native reader with every arrowhead missing and
 * every edge still drawn, which reads as a different diagram.
 *
 * **What it draws, and how it was matched to Chromium.** Each use becomes
 * `<g transform="translate(x y) rotate(a) scale(s) translate(-refX -refY)">`
 * placed after the element. The point and the direction come from the
 * element's geometry: the first vertex for `marker-start`, the last for
 * `marker-end`, every other vertex for `marker-mid`, with the direction of the
 * path at that point. `s` is `u * v`: `u` is the element's `stroke-width` for
 * `markerUnits="strokeWidth"` (the default) and 1 for `userSpaceOnUse`, which
 * mermaid 11.17.2 sets 51 times against 2 for `strokeWidth`; `v` is
 * `min(markerWidth / viewBox width, markerHeight / viewBox height)` when the
 * marker has a `viewBox`, as `xMidYMid meet` scales it, and 1 when it has none.
 * Without `v` every mermaid arrowhead came out at its viewBox size, not at the
 * size the browser draws.
 *
 * **What it refuses, by name.** An `orient` other than `auto`,
 * `auto-start-reverse` or a number; a `markerUnits` other than the two above; a
 * `preserveAspectRatio` other than the default; an arc in a path (its end
 * tangent needs the arc solved, and mermaid draws none); a marker on any
 * element other than `path`, `line` and `polyline`; a reference to a marker
 * that does not exist. Each would otherwise draw an arrowhead somewhere it is
 * not, which is worse than a build that stops.
 *
 * A marker's overflow is clipped to its viewport in the browser and is not
 * clipped here; mermaid's markers draw inside their viewport.
 */

const TAG = /<(\/?)([A-Za-z][\w:.-]*)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g
const ATTRIBUTE = /\s+([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
const MARKER = /<marker\b((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(?:\/>|>([\s\S]*?)<\/marker\s*>)/g
const MARKER_ATTRIBUTE = /^marker-(start|mid|end)$/
const REFERENCE = /^url\(\s*['"]?#([^)'"\s]+)['"]?\s*\)$/
const NUMBER = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/
const PATH_TOKEN = /[A-Za-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g

/** @param {string} text */
function attributesOf(text) {
  /** @type {Record<string, string>} */
  const attributes = {}
  for (const match of text.matchAll(ATTRIBUTE)) attributes[match[1]] = match[2] ?? match[3]
  return attributes
}

/** A number written without float noise, and never as `-0`. */
function format(value) {
  const rounded = Number(value.toFixed(6))
  return String(Object.is(rounded, -0) ? 0 : rounded)
}

function number(value, what) {
  if (!NUMBER.test(value.trim())) throw new Error(`flatten-markers: ${what} is "${value}", not a number`)
  return Number(value)
}

/** @param {string} body @param {Record<string, string>} attributes */
function readMarker(body, attributes) {
  const id = attributes.id
  if (id === undefined) throw new Error('flatten-markers: a <marker> has no id')

  const orient = (attributes.orient ?? '0').trim()
  if (orient !== 'auto' && orient !== 'auto-start-reverse' && !NUMBER.test(orient)) {
    throw new Error(`flatten-markers: marker "${id}" has orient="${orient}", which is not auto, auto-start-reverse or a number`)
  }

  const units = attributes.markerUnits ?? 'strokeWidth'
  if (units !== 'strokeWidth' && units !== 'userSpaceOnUse') {
    throw new Error(`flatten-markers: marker "${id}" has markerUnits="${units}", which is not strokeWidth or userSpaceOnUse`)
  }

  const aspect = attributes.preserveAspectRatio
  if (aspect !== undefined && aspect.trim().replace(/\s+/g, ' ') !== 'xMidYMid meet') {
    throw new Error(`flatten-markers: marker "${id}" has preserveAspectRatio="${aspect}", which is not drawn`)
  }

  const width = number(attributes.markerWidth ?? '3', `markerWidth of marker "${id}"`)
  const height = number(attributes.markerHeight ?? '3', `markerHeight of marker "${id}"`)
  let fit = 1
  if (attributes.viewBox !== undefined) {
    const box = attributes.viewBox.trim().split(/[\s,]+/).map((part) => number(part, `viewBox of marker "${id}"`))
    if (box.length !== 4 || box[2] <= 0 || box[3] <= 0) {
      throw new Error(`flatten-markers: marker "${id}" has viewBox="${attributes.viewBox}", which draws nothing`)
    }
    fit = Math.min(width / box[2], height / box[3])
  }

  return {
    id,
    orient,
    userSpace: units === 'userSpaceOnUse',
    fit,
    refX: number(attributes.refX ?? '0', `refX of marker "${id}"`),
    refY: number(attributes.refY ?? '0', `refY of marker "${id}"`),
    body: body ?? '',
  }
}

/**
 * The vertices of a path with the direction arriving at and leaving each.
 * `in` is undefined at the first vertex and `out` at the last.
 */
function pathVertices(d) {
  const tokens = d.match(PATH_TOKEN) ?? []
  const vertices = []
  let at = 0
  let command = ''
  let x = 0
  let y = 0
  let startX = 0
  let startY = 0

  const take = () => {
    if (at >= tokens.length || /[A-Za-z]/.test(tokens[at])) {
      throw new Error(`flatten-markers: path "${d}" ends a ${command} command early`)
    }
    return Number(tokens[at++])
  }
  /** One segment from the current point, with its two end tangents. */
  const segment = (toX, toY, startTangent, endTangent) => {
    const last = vertices[vertices.length - 1]
    last.out ??= startTangent
    vertices.push({ x: toX, y: toY, in: endTangent })
    x = toX
    y = toY
  }
  /** The first non-zero vector, so a control point on its end point is skipped. */
  const firstNonZero = (...vectors) => vectors.find(([dx, dy]) => dx !== 0 || dy !== 0) ?? [0, 0]

  while (at < tokens.length) {
    if (/[A-Za-z]/.test(tokens[at])) command = tokens[at++]
    else if (command === '') throw new Error(`flatten-markers: path "${d}" does not start with a command`)
    const relative = command === command.toLowerCase()
    const ox = relative ? x : 0
    const oy = relative ? y : 0

    switch (command.toUpperCase()) {
      case 'M': {
        x = take() + ox
        y = take() + oy
        startX = x
        startY = y
        vertices.push({ x, y })
        // Pairs after a moveto are linetos.
        command = relative ? 'l' : 'L'
        break
      }
      case 'L': {
        const toX = take() + ox
        const toY = take() + oy
        const tangent = [toX - x, toY - y]
        segment(toX, toY, tangent, tangent)
        break
      }
      case 'H': {
        const toX = take() + ox
        segment(toX, y, [toX - x, 0], [toX - x, 0])
        break
      }
      case 'V': {
        const toY = take() + oy
        segment(x, toY, [0, toY - y], [0, toY - y])
        break
      }
      case 'C': {
        const c1 = [take() + ox, take() + oy]
        const c2 = [take() + ox, take() + oy]
        const to = [take() + ox, take() + oy]
        segment(
          to[0], to[1],
          firstNonZero([c1[0] - x, c1[1] - y], [c2[0] - x, c2[1] - y], [to[0] - x, to[1] - y]),
          firstNonZero([to[0] - c2[0], to[1] - c2[1]], [to[0] - c1[0], to[1] - c1[1]], [to[0] - x, to[1] - y]),
        )
        break
      }
      case 'Q': {
        const c = [take() + ox, take() + oy]
        const to = [take() + ox, take() + oy]
        segment(
          to[0], to[1],
          firstNonZero([c[0] - x, c[1] - y], [to[0] - x, to[1] - y]),
          firstNonZero([to[0] - c[0], to[1] - c[1]], [to[0] - x, to[1] - y]),
        )
        break
      }
      case 'Z': {
        const tangent = [startX - x, startY - y]
        segment(startX, startY, tangent, tangent)
        break
      }
      case 'A':
        throw new Error(`flatten-markers: path "${d}" has an arc, whose direction is not read`)
      default:
        throw new Error(`flatten-markers: path "${d}" has a ${command} command, which is not read`)
    }
  }
  if (vertices.length === 0) throw new Error(`flatten-markers: path "${d}" has no vertices`)
  return vertices
}

function pointVertices(points) {
  const pairs = points.trim().split(/[\s,]+/).map((part) => number(part, 'a polyline point'))
  if (pairs.length < 2 || pairs.length % 2 !== 0) {
    throw new Error(`flatten-markers: polyline points="${points}" is not a list of pairs`)
  }
  const vertices = []
  for (let at = 0; at < pairs.length; at += 2) {
    const vertex = { x: pairs[at], y: pairs[at + 1] }
    const last = vertices[vertices.length - 1]
    if (last) {
      const tangent = [vertex.x - last.x, vertex.y - last.y]
      last.out = tangent
      vertex.in = tangent
    }
    vertices.push(vertex)
  }
  return vertices
}

function verticesOf(name, attributes) {
  if (name === 'path') return pathVertices(attributes.d ?? '')
  if (name === 'polyline') return pointVertices(attributes.points ?? '')
  if (name === 'line') {
    const read = (key) => number(attributes[key] ?? '0', `${key} of a <line>`)
    return pointVertices(`${read('x1')},${read('y1')} ${read('x2')},${read('y2')}`)
  }
  throw new Error(`flatten-markers: a marker sits on a <${name}>, which is not a path, line or polyline`)
}

const angleOf = (vector) => (vector === undefined ? undefined : (Math.atan2(vector[1], vector[0]) * 180) / Math.PI)

/** The angle a marker is drawn at on one vertex (SVG 2, "orient"). */
function orientation(marker, vertex, position) {
  if (marker.orient !== 'auto' && marker.orient !== 'auto-start-reverse') return Number(marker.orient)
  const incoming = angleOf(vertex.in)
  const outgoing = angleOf(vertex.out)
  let angle
  if (incoming === undefined) angle = outgoing ?? 0
  else if (outgoing === undefined) angle = incoming
  else {
    // The bisector of the two directions, on the short side.
    let delta = outgoing - incoming
    if (delta > 180) delta -= 360
    if (delta < -180) delta += 360
    angle = incoming + delta / 2
  }
  return marker.orient === 'auto-start-reverse' && position === 'start' ? angle + 180 : angle
}

/**
 * @param {string} svg
 * @returns {string} the same SVG with no `<marker` and no `marker-*` attribute
 */
export function flattenMarkers(svg) {
  /** @type {Map<string, ReturnType<typeof readMarker>>} */
  const markers = new Map()
  for (const match of svg.matchAll(MARKER)) {
    const marker = readMarker(match[2], attributesOf(match[1]))
    markers.set(marker.id, marker)
  }

  const withoutMarkers = svg.replace(MARKER, '')
  let out = ''
  let at = 0

  for (const match of withoutMarkers.matchAll(TAG)) {
    const [whole, closing, name, attributeText, selfClosing] = match
    const uses = closing ? [] : [...attributeText.matchAll(ATTRIBUTE)].filter((one) => MARKER_ATTRIBUTE.test(one[1]))
    if (uses.length === 0) continue

    const attributes = attributesOf(attributeText)
    const vertices = verticesOf(name, attributes)
    const keptAttributes = [...attributeText.matchAll(ATTRIBUTE)]
      .filter((one) => !MARKER_ATTRIBUTE.test(one[1]))
      .map((one) => one[0])
      .join('')

    let end = match.index + whole.length
    let tag = `<${name}${keptAttributes}${selfClosing ? '/' : ''}>`
    if (!selfClosing) {
      const close = new RegExp(`^\\s*</${name}\\s*>`).exec(withoutMarkers.slice(end))
      if (!close) throw new Error(`flatten-markers: a <${name}> with a marker has content, which is not read`)
      tag += `</${name}>`
      end += close[0].length
    }

    const groups = []
    for (const position of ['start', 'mid', 'end']) {
      const reference = attributes[`marker-${position}`]
      if (reference === undefined || reference.trim() === 'none') continue
      const id = REFERENCE.exec(reference.trim())?.[1]
      if (id === undefined) throw new Error(`flatten-markers: marker-${position}="${reference}" is not url(#id)`)
      const marker = markers.get(id)
      if (marker === undefined) throw new Error(`flatten-markers: marker-${position} names "${id}", which no <marker> defines`)

      let unit = 1
      if (!marker.userSpace) {
        if (attributes['stroke-width'] === undefined) {
          throw new Error(`flatten-markers: marker "${id}" scales by stroke width, and its <${name}> has no stroke-width`)
        }
        unit = number(attributes['stroke-width'].replace(/px$/, ''), `stroke-width of the <${name}> using marker "${id}"`)
      }
      const scale = unit * marker.fit

      const placed = position === 'start'
        ? [vertices[0]]
        : position === 'end'
          ? [vertices[vertices.length - 1]]
          : vertices.slice(1, -1)
      for (const vertex of placed) {
        const transform = `translate(${format(vertex.x)} ${format(vertex.y)}) `
          + `rotate(${format(orientation(marker, vertex, position))}) `
          + `scale(${format(scale)}) `
          + `translate(${format(-marker.refX)} ${format(-marker.refY)})`
        groups.push(`<g transform="${transform}">${marker.body}</g>`)
      }
    }

    out += withoutMarkers.slice(at, match.index) + tag + groups.join('')
    at = end
  }

  return out + withoutMarkers.slice(at)
}
