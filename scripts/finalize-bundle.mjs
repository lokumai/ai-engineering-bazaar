#!/usr/bin/env node
/**
 * The content bundle's postbuild finaliser (spec 2.5): it draws every diagram
 * the draft index lists, hashes every bundle file and image, and turns
 * `api/v1/index.draft.json` into `api/v1/index.json`.
 *
 *   node scripts/finalize-bundle.mjs out      (the `postbuild` of `npm run build`)
 *
 * **Why a second stage at all.** The route handlers write every document the
 * TypeScript pipeline can produce, but two things are out of their reach: a
 * diagram needs a browser to lay out its labels, and the index needs the hash
 * of every other file, which exists only once the export does. So the routes
 * write a draft with the hashes empty and the diagrams listed by source, and
 * this script completes it. No file is written by both.
 *
 * **What a diagram goes through**, each step because the native reader draws
 * with `flutter_svg`, which ignores CSS, markers and the baseline attributes
 * without an error (spec 2.3, 2.9.4):
 *
 * 1. Mermaid draws it in the bundled Chromium with the draft's render config
 *    for its variant, which names the variant's Mermaid theme (D107:
 *    `default` for `light`, `dark` for `dark`), inside a `.bz-figure` under
 *    the site's stylesheets with the theme stamped on `<html>` as the site
 *    stamps a reader's choice, so the four semantic edges resolve to exactly
 *    the colours a page diagram in that theme gets.
 * 2. Every computed paint and font property is written onto the element as an
 *    attribute, so the drawing no longer needs the stylesheet.
 * 3. Every label becomes one `<text>` per run of glyphs Chromium drew side by
 *    side, at an absolute `x` in the middle of the run's advance, with
 *    `text-anchor="middle"` and the baseline as `y`. The advance and not
 *    character 0, because character 0 of a right-to-left label sits at its
 *    right edge; `MEASURE` below says why runs and not the label's box.
 * 4. In Node: what does not paint is stripped, the markers are expanded into
 *    shapes, and the result is held to the profile.
 * 5. The result is drawn again in a bare page holding only the font, as the
 *    app will draw it, and every glyph must start and end within 0.5 px of
 *    where the first drawing put it. This is what proves step 2 to 4 lost
 *    nothing.
 *
 * **The site's own `@font-face` rules are dropped from the injected
 * stylesheets.** They name the site's woff2 subsets by a URL relative to the
 * export, which does not resolve in a blank page, and three of them declare
 * the family `Vazirmatn` as well, so they would compete with the pinned TTF
 * for the very family the labels are set in. The pinned TTF is the only face a
 * diagram is drawn in (spec 2.9.3).
 *
 * **It fails rather than publish a wrong drawing.** The web shows the source
 * when a diagram does not render (`MermaidFigure.tsx`); the bundle has no such
 * fallback, so any render error, profile violation or moved label exits 1,
 * naming the diagram and every module and language that shows it, and no
 * `index.json` is written. A diagram font that has not loaded exits 1 before
 * the first diagram, because a label measured in a fallback face is drawn at
 * the wrong width.
 *
 * Plain `.mjs` importing only `node:`, packages and `scripts/lib/` (spec 2.5).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { canonicalJson, contentVersionOf, sha256Hex, sortedRecord } from './lib/bundle-hash.mjs'
import { diagramPaths, imagePaths } from './lib/bundle-walk.mjs'
import { DIAGRAM_FONT } from './lib/diagram-font.mjs'
import { flattenMarkers } from './lib/flatten-markers.mjs'
import { setHtmlLang } from './lib/html-lang.mjs'
import { profileViolations, stripNonPainting } from './lib/svg-profile.mjs'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MERMAID = join(REPO, 'node_modules/mermaid/dist/mermaid.min.js')
const FONT = join(REPO, DIAGRAM_FONT.file)
const CONFORMANCE = join(REPO, 'tests/unit/record/__snapshots__/record-conformance.v1.json')

/** A glyph may move less than this, on either axis, between the two drawings. */
const TOLERANCE_PX = 0.5
/** The size the font is loaded and checked at; any size loads the same face. */
const FONT_PROBE = `13px ${DIAGRAM_FONT.family}`

/** The files under `api/v1/` that `files` does not list (spec 2.7). */
const UNLISTED = new Set(['api/v1/index.json', 'api/v1/index.draft.json', 'api/v1/record-conformance.json'])

/** The figure the site wraps a diagram in (`render.ts`), so its custom properties apply. */
const HOST_PAGE = '<!doctype html><html><head><meta charset="utf-8"></head><body>'
  + '<figure class="bz-fig bz-diagram"><div class="bz-figure bz-figure-body">'
  + '<div class="mermaid-source" id="bundle-host"></div>'
  + '</div></figure></body></html>'
const BARE_PAGE = '<!doctype html><html><head><meta charset="utf-8"></head><body><div id="bundle-host"></div></body></html>'

class Stop extends Error {}

const stop = (message) => {
  throw new Stop(message)
}

/** Every file under `dir`, as `/`-separated paths relative to `root`, sorted. */
function filesUnder(root, dir) {
  const start = join(root, dir)
  if (!existsSync(start)) return []
  const out = []
  const walk = (at) => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const path = join(at, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (entry.isFile()) out.push(relative(root, path).split('\\').join('/'))
    }
  }
  walk(start)
  return out.sort()
}

const diagramFile = (id) => `api/v1/diagrams/${id}.svg`

/**
 * `@font-face` for the pinned face, from its bytes, so nothing in the page
 * fetches; and unhinted text in both pages.
 *
 * `geometricPrecision` because Chromium's default text rendering snaps glyph
 * positions to whole device pixels. MEASURED without it: 204 labels across the
 * corpus moved by exactly 0.500 px between the two drawings, because a label
 * centred on a half pixel snaps one way inside the figure and the other way in
 * the bare page. A file carries positions, not pixels, so the unhinted
 * positions are the ones to anchor to; it changes nothing in mermaid's config.
 */
function fontFace(bytes) {
  return `@font-face { font-family: '${DIAGRAM_FONT.family}'; src: url(data:font/ttf;base64,${Buffer.from(bytes).toString('base64')}) format('truetype'); }\n`
    + 'svg { text-rendering: geometricPrecision; }'
}

/**
 * In the page: load the diagram face and say whether it is the one in use.
 * Resolves to at least one face, every face loaded, and `check` true.
 */
async function loadFont(page) {
  const result = await page.evaluate(async (probe) => {
    try {
      const faces = await document.fonts.load(probe)
      return { faces: faces.length, statuses: faces.map((face) => face.status), check: document.fonts.check(probe) }
    } catch (error) {
      return { error: String(error?.message ?? error) }
    }
  }, FONT_PROBE)
  if (result.error !== undefined || result.faces < 1 || result.statuses.some((one) => one !== 'loaded') || !result.check) {
    stop(`the diagram font ${DIAGRAM_FONT.family} did not load (${JSON.stringify(result)}); no label may be measured in a fallback face`)
  }
}

/**
 * In the page: every label RUN, in document order, with the position of each
 * of its glyphs in the root's user space.
 *
 * A leaf is a `text` or `tspan` with no element child and some non-blank text;
 * one that mixes its own text with element children is refused, because its
 * own text would keep a position this script never set. A run is a stretch of
 * a leaf's characters that Chromium drew side by side in one direction.
 *
 * **Runs, not leaves, and advances, not the bounding box.** Each was MEASURED
 * against the corpus, with the leaf and its bounding box first:
 *
 * - A label anchored with `text-anchor="middle"` is centred on its advance,
 *   and the box can be wider than that: the final `ر` of a Persian word
 *   overhangs its cell by 1 px at 13 px, so centring the box moved such labels
 *   by half the overhang. A run's span is the start and end positions of its
 *   characters, which is the advance `middle` centres.
 * - Mermaid puts each word in its own tspan with the space BEFORE it, and in a
 *   right-to-left word that space is drawn on the right inside its line but on
 *   the left once the word stands alone, so the word itself would move by a
 *   space. Spaces are dropped: every run is placed absolutely, so they carry
 *   no position.
 * - A leaf that mixes scripts is not one stretch: in `evaluator‌ها` inside a
 *   left-to-right line, `ها` joins the right-to-left run of the words after it
 *   and is drawn at the far end of the line. Centred as one word it would sit
 *   on top of its neighbours; split into runs, every glyph stays where
 *   Chromium drew it. A run breaks where the direction changes or the next
 *   character does not start within a kerning's reach of where the last ended.
 *
 * A zero-width character (a joiner) belongs to the run it is in and widens
 * nothing: Chromium reports the joiner after `evaluator` at the far end of the
 * line, with the `ها` it separates. A character that reports the same advance
 * as the one before it (the kasra of `کِی`) is part of that glyph, and never
 * starts a run of its own, which would draw its letter unjoined. A direction
 * mark is skipped, since the rewrite writes its own. A leaf whose character
 * count is not its string length (collapsed whitespace, a character outside
 * the BMP) is refused, because its positions could not be paired with its
 * characters.
 */
const MEASURE = `(svg) => {
  const leaves = []
  for (const element of svg.querySelectorAll('text, tspan')) {
    if (element.children.length > 0) {
      const own = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.data.trim() !== '')
      if (own) throw new Error('a <' + element.tagName + '> mixes its own text with child elements: ' + JSON.stringify(element.textContent))
      continue
    }
    if (element.textContent.trim() === '') continue
    leaves.push(element)
  }
  const toRoot = svg.getScreenCTM().inverse()
  const runs = []
  for (const element of leaves) {
    const text = element.textContent
    const count = element.getNumberOfChars()
    if (count !== text.length) {
      throw new Error('the label ' + JSON.stringify(text) + ' has ' + count + ' addressable characters for ' + text.length + ' code units')
    }
    const kerning = 0.3 * parseFloat(getComputedStyle(element).fontSize)
    const toRootHere = toRoot.multiply(element.getScreenCTM())
    const glyphAt = (start, end, cell) => [
      new DOMPoint(start.x, cell.y + cell.height / 2).matrixTransform(toRootHere),
      new DOMPoint(end.x, cell.y + cell.height / 2).matrixTransform(toRootHere),
    ].map((point) => ({ x: point.x, y: point.y }))
    let run = null
    for (let i = 0; i < count; i++) {
      if (/\\s/.test(text[i])) {
        run = null
        continue
      }
      if (text[i] === '\\u200e' || text[i] === '\\u200f') continue
      const start = element.getStartPositionOfChar(i)
      const end = element.getEndPositionOfChar(i)
      const cell = element.getExtentOfChar(i)
      if (Math.abs(end.x - start.x) < 1e-6) {
        if (run === null) runs.push(run = { element, first: i, text: '', glyphs: [], left: Infinity, right: -Infinity })
        run.text += text[i]
        continue
      }
      // A character of the same cluster as the last (a mark on its letter)
      // reports the same advance; it is part of that glyph.
      if (run !== null && run.last !== undefined && Math.abs(start.x - run.last[0]) < 1e-3 && Math.abs(end.x - run.last[1]) < 1e-3) {
        run.text += text[i]
        continue
      }
      const rightward = end.x > start.x
      // Punctuation straight after a right-to-left word, which the line's own
      // direction drew to the right of the right-to-left words before it,
      // stays with those words: standing alone it would be shaped without
      // their script (MEASURED: the " of a Persian sequence message changed
      // width by 1.33 px). The words and the punctuation become one run,
      // spaces included, written with no direction marks, so the reader's
      // bidi lays them out as Chromium did.
      const neutral = !/[\p{L}\p{M}\p{N}]/u.test(text[i])
      if (run !== null && run.tail === true && rightward && neutral) {
        run.text = text.slice(run.first, i + 1)
        run.left = Math.min(run.left, start.x, end.x)
        run.right = Math.max(run.right, start.x, end.x)
        run.glyphs.push(glyphAt(start, end, cell))
        continue
      }
      if (run !== null && run.rightward === false && rightward && neutral && !/\s/.test(text[i - 1] ?? ' ')) {
        let from = runs.length
        while (from > 0 && runs[from - 1].element === element && runs[from - 1].rightward === false && runs[from - 1].tail !== true) from -= 1
        const block = runs.slice(from)
        const edge = Math.max(...block.map((one) => one.right))
        if (Math.abs(start.x - edge) < kerning) {
          runs.splice(from)
          runs.push(run = {
            element,
            first: block[0].first,
            text: text.slice(block[0].first, i + 1),
            glyphs: [...block.flatMap((one) => one.glyphs), glyphAt(start, end, cell)],
            left: Math.min(...block.map((one) => one.left), start.x, end.x),
            right: Math.max(edge, start.x, end.x),
            rightward: false,
            tail: true,
          })
          continue
        }
      }
      if (run === null || run.tail === true || (run.rightward !== undefined && (run.rightward !== rightward || Math.abs(start.x - run.pen) >= kerning))) {
        runs.push(run = { element, first: i, text: '', glyphs: [], left: Infinity, right: -Infinity })
      }
      run.text += text[i]
      run.rightward = rightward
      run.pen = end.x
      run.last = [start.x, end.x]
      run.left = Math.min(run.left, start.x, end.x)
      run.right = Math.max(run.right, start.x, end.x)
      const middle = cell.y + cell.height / 2
      run.glyphs.push([
        new DOMPoint(start.x, middle).matrixTransform(toRootHere),
        new DOMPoint(end.x, middle).matrixTransform(toRootHere),
      ].map((point) => ({ x: point.x, y: point.y })))
    }
  }
  return runs.filter((one) => one.glyphs.length > 0).map((one) => ({ ...one, label: one.text }))
}`

/**
 * In the page: draw one diagram, write its computed style as attributes,
 * anchor every label run in the middle of its advance, and serialise it.
 */
async function draw(page, diagram, theme) {
  return page.evaluate(async ({ id, variant, source, measure, theme }) => {
    const leavesOf = (0, eval)(measure)
    const root = document.documentElement
    if (variant === 'dark') root.setAttribute('class', 'dark')
    else root.removeAttribute('class')
    root.setAttribute('data-hl-diagram', theme)

    const host = document.getElementById('bundle-host')
    host.replaceChildren()
    const renderId = `bundle-${id}`
    let markup
    try {
      ;({ svg: markup } = await window.mermaid.render(renderId, source))
    } catch (error) {
      document.getElementById(renderId)?.remove()
      document.getElementById(`d${renderId}`)?.remove()
      return { error: `mermaid could not draw it: ${String(error?.message ?? error)}` }
    }
    host.innerHTML = markup
    const svg = host.querySelector('svg')
    if (svg === null) return { error: 'mermaid returned no <svg>' }

    // Spec 2.9.4's property list. The inherited ones are written in full on
    // every element that paints, because the marker expansion moves a marker's
    // shapes under a different parent and nothing may depend on inheritance;
    // the non-inherited ones only where they differ from their initial value.
    const PAINTED = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'text', 'tspan'])
    const INHERITED = [
      'fill', 'stroke', 'stroke-width', 'fill-opacity', 'stroke-opacity', 'stroke-dasharray',
      'stroke-linecap', 'stroke-linejoin', 'visibility',
    ]
    const FONT = ['font-family', 'font-size', 'font-weight', 'font-style']
    const CORNERS = new Set(['rect', 'ellipse'])
    const lengths = (value) => value.replace(/(\d)px\b/g, '$1')

    const writes = []
    for (const element of svg.querySelectorAll('*')) {
      const name = element.tagName
      const style = getComputedStyle(element)
      const attributes = {}
      if (PAINTED.has(name)) {
        for (const property of INHERITED) attributes[property] = lengths(style.getPropertyValue(property))
        if (name === 'text' || name === 'tspan') {
          for (const property of FONT) attributes[property] = lengths(style.getPropertyValue(property))
        }
        if (CORNERS.has(name)) {
          for (const property of ['rx', 'ry']) {
            const value = style.getPropertyValue(property)
            if (value !== 'auto') attributes[property] = lengths(value)
          }
        }
      }
      if (style.getPropertyValue('opacity') !== '1') attributes.opacity = style.getPropertyValue('opacity')
      if (style.getPropertyValue('display') === 'none') attributes.display = 'none'
      writes.push([element, attributes])
    }
    for (const [element, attributes] of writes) {
      for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value)
    }

    // Every position is read before any is written: moving one label to an
    // absolute x starts a new text chunk and would shift the next one.
    let runs
    try {
      runs = leavesOf(svg)
    } catch (error) {
      return { error: String(error?.message ?? error) }
    }
    const round = (value) => String(Number(value.toFixed(3)))
    const placed = runs.map((run) => ({
      ...run,
      at: [round((run.left + run.right) / 2), round(run.element.getStartPositionOfChar(run.first).y)],
    }))
    // A right-to-left run is written between two right-to-left marks. Standing
    // alone in a left-to-right text, its neutral characters would otherwise
    // take the paragraph's direction: MEASURED, the Persian comma of `هفته،`
    // moved from the left of the word to its right once the word was its own
    // chunk. The marks are invisible and give the run the order it was drawn in.
    const written = (run) => (run.rightward === false && run.tail !== true ? '\u200f' + run.text + '\u200f' : run.text)
    // Every run becomes a <text> of its own, placed before the <text> it came
    // from, which then goes. Not a tspan inside the old one: a <text> holding
    // several absolutely placed chunks of mixed direction asks the reader's
    // renderer to resolve bidi across them, and one run per element leaves it
    // a single left-to-right or right-to-left string to draw.
    // A run takes the attributes of its <text> (its transform among them) and
    // then those of its leaf, which the computed-style pass above made complete.
    const POSITIONAL = new Set(['id', 'x', 'y', 'dx', 'dy', 'rotate', 'textLength', 'lengthAdjust', 'text-anchor'])
    const replaced = new Set()
    const labels = []
    for (const run of placed) {
      const owner = run.element.closest('text')
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      for (const source of new Set([owner, run.element])) {
        for (const { name, value } of source.attributes) {
          if (!POSITIONAL.has(name)) label.setAttribute(name, value)
        }
      }
      label.setAttribute('x', run.at[0])
      label.setAttribute('y', run.at[1])
      label.setAttribute('text-anchor', 'middle')
      label.textContent = written(run)
      owner.before(label)
      replaced.add(owner)
      labels.push([run, label])
    }
    for (const owner of replaced) owner.remove()

    // The baseline is folded into y here, against the drawing itself. A label
    // Mermaid centres with `dominant-baseline` (every sequence diagram's
    // message and actor text) reports its anchor, not its alphabetic baseline,
    // as the start position, and once the stripper drops the attribute and the
    // class that set it the label would sit lower by that offset: MEASURED,
    // 4.227 px on a 16 px message and 3.5 px on a 13 px actor in the first
    // sequence diagram the course drew. So each new label is drawn with the
    // baseline the file will have, and its y moves by however far its first
    // glyph then sits from where the first drawing put it; that is zero for a
    // label that used the alphabetic baseline all along.
    const toRoot = svg.getScreenCTM().inverse()
    for (const [run, label] of labels) {
      label.style.setProperty('dominant-baseline', 'auto')
      label.style.setProperty('alignment-baseline', 'auto')
      label.style.setProperty('baseline-shift', '0')
      const text = label.textContent
      let first = -1
      for (let i = 0; i < text.length && first === -1; i++) {
        if (/\s/.test(text[i]) || text[i] === '\u200e' || text[i] === '\u200f') continue
        if (label.getExtentOfChar(i).width > 0) first = i
      }
      if (first !== -1) {
        const cell = label.getExtentOfChar(first)
        const toLocal = toRoot.multiply(label.getScreenCTM()).inverse()
        const target = new DOMPoint(run.glyphs[0][0].x, run.glyphs[0][0].y).matrixTransform(toLocal)
        const shift = target.y - (cell.y + cell.height / 2)
        if (Math.abs(shift) > 1e-6) label.setAttribute('y', round(Number(label.getAttribute('y')) + shift))
      }
      label.removeAttribute('style')
    }

    return {
      svg: new XMLSerializer().serializeToString(svg),
      labels: placed.map(({ label, glyphs }) => ({ label, glyphs })),
    }
  }, { ...diagram, measure: MEASURE, theme })
}

/** In the bare page: every label run's glyphs, as the app will draw the file. */
async function redraw(page, svg) {
  return page.evaluate(({ markup, measure }) => {
    const leavesOf = (0, eval)(measure)
    const host = document.getElementById('bundle-host')
    host.innerHTML = markup
    const drawing = host.querySelector('svg')
    if (drawing === null) return { error: 'the finished file holds no <svg>' }
    try {
      return { labels: leavesOf(drawing).map(({ label, glyphs }) => ({ label, glyphs })) }
    } catch (error) {
      return { error: String(error?.message ?? error) }
    }
  }, { markup: svg, measure: MEASURE })
}

/**
 * How the redrawn labels differ from the first drawing: every run in the same
 * order with the same text, and every glyph's start and end within the
 * tolerance on both axes. Glyphs and not label centres, because a centre can
 * agree with itself while the glyphs around it moved.
 *
 * @returns {{ problems: string[], largest: number }}
 */
function moved(before, after) {
  if (before.length !== after.length) {
    return { problems: [`the first drawing has ${before.length} label runs and the finished file ${after.length}`], largest: Infinity }
  }
  const problems = []
  let largest = 0
  for (const [i, label] of before.entries()) {
    const again = after[i]
    if (again.label !== label.label || again.glyphs.length !== label.glyphs.length) {
      problems.push(`label run ${i + 1} was ${JSON.stringify(label.label)} and is ${JSON.stringify(again.label)}`)
      continue
    }
    let worst = 0
    let axis = 'x'
    for (const [g, glyph] of label.glyphs.entries()) {
      for (const [p, point] of glyph.entries()) {
        const dx = Math.abs(again.glyphs[g][p].x - point.x)
        const dy = Math.abs(again.glyphs[g][p].y - point.y)
        if (Math.max(dx, dy) > worst) {
          worst = Math.max(dx, dy)
          axis = dx >= dy ? 'x' : 'y'
        }
      }
    }
    largest = Math.max(largest, worst)
    if (worst >= TOLERANCE_PX) problems.push(`the label ${JSON.stringify(label.label)} moved by ${worst.toFixed(3)} px along ${axis}`)
  }
  return { problems, largest }
}

async function main() {
  const argument = process.argv[2]
  if (argument === undefined) stop('usage: node scripts/finalize-bundle.mjs <outDir>')

  // 1. The browser, before anything is read.
  if (!existsSync(chromium.executablePath())) {
    stop(`Playwright's bundled Chromium is not installed at ${chromium.executablePath()}; run: npx playwright install chromium`)
  }

  const outDir = resolve(argument)
  const at = (path) => join(outDir, path)

  // 2. The draft, and what the documents name.
  const draftPath = 'api/v1/index.draft.json'
  if (!existsSync(at(draftPath))) stop(`${at(draftPath)} does not exist; run next build first`)
  for (const finished of ['api/v1/index.json', 'api/v1/diagrams']) {
    if (existsSync(at(finished))) stop(`${at(finished)} already exists: the export was finalised, or a run stopped part way; build it again`)
  }
  const draft = JSON.parse(readFileSync(at(draftPath), 'utf8'))
  if (!Array.isArray(draft.diagrams)) stop(`${draftPath} has no diagrams list`)
  for (const variant of ['light', 'dark']) {
    if (draft.render?.[variant] === undefined) stop(`${draftPath} has no ${variant} render config`)
    if (typeof draft.diagramThemes?.[variant]?.theme !== 'string') stop(`${draftPath} names no ${variant} diagram theme`)
  }
  if (!existsSync(CONFORMANCE)) stop(`the record conformance snapshot ${CONFORMANCE} does not exist`)
  if (!existsSync(FONT)) stop(`the diagram font ${FONT} does not exist; run npm install`)

  /** diagram path -> where it is shown; image src -> the documents naming it */
  const shownIn = new Map()
  const images = new Map()
  for (const path of [...filesUnder(outDir, 'api/v1/levels'), ...filesUnder(outDir, 'api/v1/modules')]) {
    if (!path.endsWith('.json')) continue
    const doc = JSON.parse(readFileSync(at(path), 'utf8'))
    const where = typeof doc.key === 'string' ? `module ${doc.key} (${doc.track}, ${doc.lang})` : `level ${doc.slug}`
    for (const svg of diagramPaths(doc)) shownIn.set(svg, [...(shownIn.get(svg) ?? []), where])
    for (const src of imagePaths(doc)) images.set(src, [...(images.get(src) ?? []), path])
  }
  for (const [src, where] of images) {
    if (!existsSync(at(src))) stop(`the image ${src}, named by ${where.join(', ')}, does not exist under ${outDir}`)
  }
  const named = (id) => {
    const where = shownIn.get(diagramFile(id))
    return where === undefined ? 'named by no document' : `shown in ${where.join(', ')}`
  }

  // 3. The browser, the stylesheets, the font and mermaid.
  const fontBytes = readFileSync(FONT)
  const browser = await chromium.launch()
  const drawn = new Map()
  try {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.setContent(HOST_PAGE)
    const stylesheets = filesUnder(outDir, '_next/static').filter((path) => path.endsWith('.css'))
    if (stylesheets.length === 0) stop(`${at('_next/static')} holds no stylesheet; the diagrams would be drawn without the site's palette`)
    for (const path of stylesheets) {
      await page.addStyleTag({ content: readFileSync(at(path), 'utf8').replace(/@font-face\s*\{[^}]*\}/g, '') })
    }
    await page.addStyleTag({ content: fontFace(fontBytes) })
    await page.addScriptTag({ path: MERMAID })

    // 4. The face is loaded before the first label is measured.
    await loadFont(page)

    const bare = await context.newPage()
    await bare.setContent(BARE_PAGE)
    await bare.addStyleTag({ content: fontFace(fontBytes) })
    await loadFont(bare)

    const failures = []
    let largest = 0
    // One theme at a time: mermaid holds one config, so each variant's
    // diagrams are drawn after initialising it with that variant's config.
    for (const variant of ['light', 'dark']) {
      await page.evaluate((config) => window.mermaid.initialize(config), draft.render[variant])
      const theme = draft.diagramThemes[variant].theme
      for (const diagram of draft.diagrams.filter((one) => one.variant === variant)) {
        const fail = (message) => failures.push(`diagram ${diagram.id} (${diagram.variant}), ${named(diagram.id)}: ${message}`)

        // 5 and 6. Draw, write the computed style, anchor the labels.
        const result = await draw(page, diagram, theme)
        if (result.error !== undefined) {
          fail(result.error)
          continue
        }

        // 7. Strip, expand the markers, hold to the profile.
        let svg
        try {
          svg = flattenMarkers(stripNonPainting(result.svg))
        } catch (error) {
          fail(error.message)
          continue
        }
        const violations = profileViolations(svg)
        if (violations.length > 0) {
          for (const violation of violations) fail(violation)
          continue
        }

        // 8. Every label where Chromium first drew it.
        const again = await redraw(bare, svg)
        if (again.error !== undefined) {
          fail(again.error)
          continue
        }
        const { problems, largest: worst } = moved(result.labels, again.labels)
        if (problems.length > 0) {
          for (const problem of problems) fail(problem)
          continue
        }
        largest = Math.max(largest, worst)
        drawn.set(diagram.id, svg)
      }
    }

    // 9. Nothing is written unless every diagram passed.
    if (failures.length > 0) stop(`${failures.length} diagram failure(s):\n  ${failures.join('\n  ')}`)
    console.log(`finalize-bundle: drew ${drawn.size} diagrams; the largest glyph move was ${largest.toFixed(3)} px`)
  } finally {
    await browser.close()
  }

  // 10. The diagrams and the record conformance snapshot.
  mkdirSync(at('api/v1/diagrams'))
  for (const [id, svg] of drawn) writeFileSync(at(diagramFile(id)), svg)
  copyFileSync(CONFORMANCE, at('api/v1/record-conformance.json'))

  // 11. The hashes, then the index, then the draft goes.
  const index = draft
  index.files = sortedRecord(
    filesUnder(outDir, 'api/v1')
      .filter((path) => !UNLISTED.has(path))
      .map((path) => [path, sha256Hex(readFileSync(at(path)))]),
  )
  index.images = sortedRecord([...images.keys()].map((src) => [src, sha256Hex(readFileSync(at(src)))]))
  delete index.diagrams
  delete index.render
  index.contentVersion = contentVersionOf(index)

  const partial = at('api/v1/index.json.partial')
  writeFileSync(partial, canonicalJson(index))
  renameSync(partial, at('api/v1/index.json'))
  rmSync(at(draftPath))
  console.log(`finalize-bundle: wrote api/v1/index.json, contentVersion ${index.contentVersion}, ${Object.keys(index.files).length} files and ${Object.keys(index.images).length} images`)

  // 3. D119: `<html lang>` of each translation's pages. The root layout is one for every
  // language and renders `en`; the export is where the address of each page is known.
  // After the bundle is written, because the bundle's hashes cover no HTML.
  if (!Array.isArray(index.translations) || index.translations.length === 0) stop('the index lists no translations, so no page can be given its language')
  const counts = setHtmlLang(outDir, index.translations.map((one) => one.id))
  console.log(`finalize-bundle: set <html lang> on ${Object.entries(counts).map(([lang, count]) => `${count} ${lang}`).join(', ')} pages`)
}

try {
  await main()
} catch (error) {
  console.error(`\nfinalize-bundle: ${error instanceof Stop ? error.message : error?.stack ?? error}\n`)
  process.exit(1)
}
