import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '@/lib/content/render'

/**
 * One fake module, and a stored copy of what the renderer makes of it.
 *
 * The file next door carries every structure the pipeline understands: a lead
 * paragraph, a Roman-numbered section, a three-column table, a captioned
 * image, a mermaid diagram with a semantic fill, a tagged fence, an untagged
 * fence, both kinds of blockquote, a checklist, an external link, two
 * cross-references and a Quick Check.
 *
 * Change the renderer and this test prints a line-by-line diff of what changed
 * in the output. Accept it with `npx vitest -u` or fix what you broke.
 *
 * It stays quiet because the input is invented and frozen. Point the same
 * technique at the real corpus and every edit to a module turns the build red,
 * which is the mistake this suite has already made once. See tests/README.md.
 */

const FIXTURE = join(import.meta.dirname, '../../fixtures/kitchen-sink.md')

const render = () =>
  renderMarkdown(readFileSync(FIXTURE, 'utf8'), {
    imageBase: '/course-images/fundamentals',
    sheet: 1,
  })

describe('the whole pipeline, over one fake module', () => {
  it('renders the HTML it rendered last time', async () => {
    const { html } = await render()
    await expect(html).toMatchFileSnapshot('./__snapshots__/kitchen-sink.html')
  })

  it('collects the same table of contents', async () => {
    const { toc } = await render()
    expect(toc).toMatchSnapshot()
  })

  it('collects the same checklist', async () => {
    const { checklist } = await render()
    expect(checklist).toMatchSnapshot()
  })
})
