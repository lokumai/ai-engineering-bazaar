import { describe, expect, it } from 'vitest'
import { imageBaseFor } from '@/lib/content/images'
import { type CourseModule, loadAllModules } from '@/lib/content/loader'
import { DIAGRAM_HEADING } from '@/lib/content/lines'
import { type RenderedMarkdown, renderMarkdown } from '@/lib/content/render'
import { sectionTitles } from '@/lib/content/topics'
import { sheetCount } from '@/lib/content/curriculum'

/**
 * The render pipeline, run against the real corpus rather than fixtures.
 *
 * A fixture proves the transform does what its author expected. Thirty-two
 * real modules — 96 Roman-numeral headings, 44 tagged code blocks, 30 diagrams,
 * 46 tables, 404 external links and 8 images — prove it survives the content
 * that actually exists, which is the only thing a reader will ever see.
 *
 * Run on its own with:  npx vitest run tests/corpus
 */

const modules = loadAllModules()

const rendered = new Map<string, RenderedMarkdown>()

async function renderAll(): Promise<Map<string, RenderedMarkdown>> {
  if (rendered.size > 0) return rendered
  for (const module of modules) {
    rendered.set(
      module.slug,
      await renderMarkdown(module.body, {
        imageBase: imageBaseFor(module.category.slug),
        sheet: module.frontmatter.module,
      }),
    )
  }
  return rendered
}

function forEachModule(
  assertion: (module: CourseModule, output: RenderedMarkdown) => void,
): () => Promise<void> {
  return async () => {
    const all = await renderAll()
    for (const module of modules) {
      const output = all.get(module.slug)
      expect(output, `${module.slug} did not render`).toBeDefined()
      assertion(module, output as RenderedMarkdown)
    }
  }
}

describe('the corpus renders', () => {
  it('finds every sheet in the set', () => {
    expect(modules).toHaveLength(sheetCount())
  })

  it('renders every one of them without throwing', async () => {
    const all = await renderAll()
    expect(all.size).toBe(sheetCount())
    for (const [slug, output] of all) {
      expect(output.html.length, `${slug} rendered empty`).toBeGreaterThan(0)
    }
  })
})

describe('B6.1 / B6.2 — the header lines the title block already states', () => {
  it('leaks no h1 into the prose', forEachModule((_, { html }) => {
    expect(html).not.toContain('<h1')
  }))

  it('leaks no category dek', forEachModule((_, { html }) => {
    expect(html).not.toMatch(/<em>(Category|Kategori):/)
  }))
})

describe('B6.3 — section marks', () => {
  it('never leaves a numeral in an h2 heading text', forEachModule((module, { toc }) => {
    // h3s carry their own `A.` / `B.` lettering, which §6.1 deliberately leaves
    // alone: only h2 is a section.
    for (const entry of toc.filter((e) => e.depth === 2)) {
      expect(entry.text, `${module.slug}`).not.toMatch(/^[IVXLC]+\.\s/)
    }
  }))

  it('gives every section a non-empty id and text', forEachModule((module, { toc }) => {
    for (const entry of toc) {
      expect(entry.id, `${module.slug}`).toMatch(/\S/)
      expect(entry.text, `${module.slug}`).toMatch(/\S/)
    }
  }))
})

/**
 * `topics.ts` reads sections out of the markdown with a regex and `render.ts`
 * reads them out of the rendered tree. Two readers of one fact, and they had
 * two private copies of the rule that recognises `## Mermaid Diagram: …`; the
 * comment beside one of them claimed the build deleted the heading, which
 * Appendix B never asked for and the build has never done. Either copy drifting
 * changes what a `FIG. n.n — …` caption is labelled or what a category page
 * lists, so the constant is shared and this is the check that they agree on the
 * whole corpus rather than on a fixture.
 */
describe('§4.9 — the TOPICS column reads the same sections the sheet renders', () => {
  it('lists exactly the h2s of the spine, less the diagram headings',
    forEachModule((module, { toc }) => {
      const spine = toc.filter((entry) => entry.depth === 2).map((entry) => entry.text)
      const kept = spine.filter((title) => !DIAGRAM_HEADING.test(title))
      expect(sectionTitles(module.body), module.slug).toEqual(kept)
    }))

})

describe('B5 — every table and figure is width-classed and scrollable', () => {
  it('classes every table, and never leaves one unclassed', forEachModule((module, { html }) => {
    const figures = html.match(/<figure class="hl-figure hl-table"[^>]*>/g) ?? []
    const tables = html.match(/<table>/g) ?? []
    expect(figures.length, `${module.slug}`).toBe(tables.length)
    for (const figure of figures) {
      expect(figure, `${module.slug}`).toMatch(/data-hl-width="(prose|wide|full)"/)
    }
  }))

  it('puts every table inside its own scroll container', forEachModule((module, { html }) => {
    const tables = (html.match(/<table>/g) ?? []).length
    const scrollers = (html.match(/<div class="table-scroll"/g) ?? []).length
    expect(scrollers, `${module.slug}`).toBe(tables)
  }))

  it('gives every scroll container a keyboard entry point (§10.3)', forEachModule((module, { html }) => {
    for (const region of html.match(/<div class="(table-scroll|hl-diagram-body)"[^>]*>/g) ?? []) {
      expect(region, `${module.slug}`).toContain('tabindex="0"')
      expect(region, `${module.slug}`).toContain('role="region"')
      expect(region, `${module.slug}`).toMatch(/aria-label="[^"]+"/)
    }
  }))

  it('captions every figure with a figcaption, never a div (§10.2)', forEachModule((module, { html }) => {
    const figures = (html.match(/<figure class="hl-figure/g) ?? []).length
    const captions = (html.match(/<figcaption class="hl-cap"/g) ?? []).length
    expect(captions, `${module.slug}`).toBe(figures)
  }))

  /**
   * §6.5 and §6.10 B5 give the caption strip 28px and a short label. What used
   * to go in it was whatever the author wrote in italics under the image —
   * 335 characters on module 5, which set as 11px tracked uppercase mono made
   * the strip 129px tall at 390px. The label is now a *name* — the alt, or the
   * section heading — and the sentence is a separate line, so the length is
   * bounded by what a heading is rather than by a character-count heuristic.
   *
   * This is the guard on that bound, and the bound is derived, not chosen.
   * MEASURED: 11px IBM Plex Mono at +0.06em is 7.26px per character, so the
   * 656px measure (§3.3) holds 90 characters on one line. The longest label in
   * the corpus today is 84 — an h3 on module 10 — and every sentence that used
   * to reach the strip was over 200.
   */
  const LABEL_MAX = 90

  it('keeps every caption label short enough for a 28px strip (§6.5)', forEachModule((module, { html }) => {
    const labels = [...html.matchAll(/<span class="hl-cap-label">([^<]*)<\/span>/g)]
      .map((match) => match[1])
    for (const text of labels) {
      expect(text.length, `${module.slug}: "${text}"`).toBeLessThanOrEqual(LABEL_MAX)
    }
  }))

  it('sets an image\'s authored sentence below the strip, not in it', async () => {
    const all = await renderAll()
    const notes = [...modules].flatMap((module) =>
      [...(all.get(module.slug)?.html ?? '').matchAll(
        /<p class="hl-cap-note">([^<]*)<\/p>/g,
      )].map((match) => match[1]),
    )
    // MEASURED: 8 images in the corpus, 7 of them with an `<em>` line under
    // them (module 1's context-window image has none).
    expect(notes.length).toBeGreaterThanOrEqual(6)
    expect(Math.max(...notes.map((note) => note.length))).toBeGreaterThan(200)
  })
})

describe('B3 — no hardcoded colour reaches the browser', () => {
  it('leaves no raw fill anywhere in the rendered corpus', forEachModule((module, { html }) => {
    expect(html, `${module.slug}`).not.toMatch(/fill:\s*#[0-9A-Fa-f]{3,8}/)
  }))

  it('leaves no colour literal at all inside a mermaid source', forEachModule((module, { html }) => {
    for (const match of html.matchAll(/data-mermaid="([^"]*)"/g)) {
      expect(match[1], `${module.slug}`).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/)
    }
  }))

})

describe('§6.7 — code blocks', () => {
  it('gives every block a language tag and a copy control', forEachModule((module, { html }) => {
    const blocks = (html.match(/<div class="hl-code"/g) ?? []).length
    expect((html.match(/data-hl-copy/g) ?? []).length, `${module.slug}`).toBe(blocks)
    expect((html.match(/class="hl-code-lang"/g) ?? []).length, `${module.slug}`).toBe(blocks)
  }))

  it('never leaves a bare pre outside a code container', forEachModule((module, { html }) => {
    const containers = (html.match(/<div class="hl-code"/g) ?? []).length
    expect((html.match(/<pre/g) ?? []).length, `${module.slug}`).toBe(containers)
  }))

  it('emphasises keywords at 500, never at bold', forEachModule((module, { html }) => {
    expect(html, `${module.slug}`).not.toContain('font-weight:bold')
  }))

  it('emits both theme variants wherever it highlights (B8)', async () => {
    const all = await renderAll()
    const highlighted = [...all.values()].filter((o) => o.html.includes('--shiki-light:'))
    expect(highlighted.length).toBeGreaterThan(0)
    for (const output of highlighted) expect(output.html).toContain('--shiki-dark:')
  })
})

describe('§6.3 — links', () => {
  it('marks every external link and no internal one', forEachModule((module, { html }) => {
    const externals = (html.match(/data-hl-external/g) ?? []).length
    const marks = (html.match(/class="hl-ext-mark"/g) ?? []).length
    expect(marks, `${module.slug}`).toBe(externals)
    for (const anchor of html.match(/<a href="(?!https?:)[^"]*"[^>]*>/g) ?? []) {
      expect(anchor, `${module.slug}`).not.toContain('data-hl-external')
    }
  }))
})
