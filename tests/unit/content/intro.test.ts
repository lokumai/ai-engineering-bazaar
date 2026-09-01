import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '@/lib/content/categories'
import { categoryIntro, stripCategoryManifest } from '@/lib/content/intro'

/**
 * §4.9 — the subsystem's own README, rendered through the prose pipeline.
 *
 * Two pieces of it must not survive the build: the `## Modules` manifest,
 * which the category page's own index table states in full and states better,
 * and the `[← Back to overview]` link, which addresses `../index.md` — a file
 * path, and a README is rendered with no sheet number, so `rehypeCourseLinks`
 * has no origin to resolve a relative href against and throws rather than
 * emitting it. A README that kept its manifest would fail the build.
 * Both are stripped here, at load time, in the pipeline: `mini-courses/` is
 * the authored corpus and stays as its authors wrote it.
 */

const README = `# Fundamentals

The starting point of the series.

## Modules

1. **Module 1: LLM Fundamentals**
   - English: [1_llms.md](1_llms.md)
   - Turkish: [1_llms_tr.md](1_llms_tr.md)

2. **Module 2: Training LLMs**
   - English: [2_training.md](2_training.md)

Start with Module 1 and progress through the series!

[← Back to overview](../index.md)
`

describe('stripCategoryManifest', () => {
  const stripped = stripCategoryManifest(README)

  it('drops the h1 the page already prints from the category map', () => {
    expect(stripped).not.toContain('# Fundamentals')
  })

  it('drops the module manifest, which the index table below it states', () => {
    expect(stripped).not.toContain('## Modules')
    expect(stripped).not.toContain('Module 1: LLM Fundamentals')
  })

  it('drops every link into a markdown file, which is not a route here', () => {
    expect(stripped).not.toContain('.md')
  })

  it('drops the back-link to a page this site does not serve', () => {
    expect(stripped).not.toContain('Back to overview')
  })

  it('keeps the prose, including a line written after the manifest', () => {
    expect(stripped).toContain('The starting point of the series.')
    expect(stripped).toContain('Start with Module 1 and progress through the series!')
  })

  it('keeps a second section, which is prose and not a manifest', () => {
    const withSection = `# Expert\n\nLead.\n\n## Notes\n\nA note.\n`
    expect(stripCategoryManifest(withSection)).toContain('## Notes')
  })

  it('never reads a manifest heading out of a fenced code block', () => {
    const fenced = '# Optional\n\n```markdown\n## Modules\n```\n\nKept.\n'
    expect(stripCategoryManifest(fenced)).toContain('Kept.')
  })

  it('keeps the fenced block itself, which is prose the page must render', () => {
    // The scanner in `lines.ts` deletes a fence and everything in it, which is
    // right for reading structure and silently wrong here: this is the one
    // caller whose output is rendered.
    const fenced = '# Ecosystem\n\nIntro.\n\n```bash\nnpm install\n```\n\nAfter.\n'
    const stripped = stripCategoryManifest(fenced)
    expect(stripped).toContain('```bash')
    expect(stripped).toContain('npm install')
    expect(stripped).toContain('Intro.')
    expect(stripped).toContain('After.')
  })

  it('keeps a manifest-shaped line inside a fence, without keeping a real one', () => {
    const fenced = [
      '# Protocols',
      '',
      '```markdown',
      '## Modules',
      '',
      '1. **Module 30**',
      '- [30_protocols.md](30_protocols.md)',
      '```',
      '',
      '## Modules',
      '',
      '1. **Module 30**',
      '',
      'Tail.',
    ].join('\n')
    const stripped = stripCategoryManifest(fenced)
    expect(stripped.match(/## Modules/g)).toHaveLength(1)
    expect(stripped).toContain('30_protocols.md')
    expect(stripped).toContain('Tail.')
  })

  it('keeps a tilde fence the same way it keeps a backtick one', () => {
    const fenced = '# Expert\n\n~~~\n## Modules\n~~~\n\nKept.\n'
    expect(stripCategoryManifest(fenced)).toContain('## Modules')
    expect(stripCategoryManifest(fenced)).toContain('Kept.')
  })

  it('returns an empty string for a README that is only its manifest', () => {
    expect(stripCategoryManifest('# Protocols\n\n## Modules\n\n1. **Module 30**\n')).toBe('')
  })
})

describe('categoryIntro — the real READMEs', () => {
  it('gives every category prose with no manifest left in it', () => {
    for (const category of CATEGORIES) {
      const intro = categoryIntro(category.slug)
      expect(intro, category.slug).not.toBeNull()
      expect(intro, category.slug).not.toContain('## Modules')
      // A relative `.md` link would render as a dead link on a static export.
      expect(intro, category.slug).not.toMatch(/\]\([^)]*\.md[^)]*\)/)
      expect(intro?.trim().length, category.slug).toBeGreaterThan(0)
    }
  })

  it('does not repeat the h1 the category page renders', () => {
    for (const category of CATEGORIES) {
      expect(categoryIntro(category.slug), category.slug)
        .not.toContain(`# ${category.title}`)
    }
  })

  it('returns null for a slug no category claims', () => {
    expect(categoryIntro('wizardry')).toBeNull()
  })
})
