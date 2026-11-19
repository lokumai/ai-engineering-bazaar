import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '@/lib/content/render'

/**
 * A markdown file is written by people and now by agents, and its HTML is set into the page and
 * into the bundle the mobile reader renders. The rule this holds for any content: markup that runs
 * script does not survive the real pipeline. It is dropped at `remarkRehype`, which is not given
 * `allowDangerousHtml`; `rehypeStringify` is, because the pipeline's own nodes use it, and that
 * pairing is exactly what a well-meant "let authors use raw HTML" change would break.
 */
describe('the markdown pipeline does not pass script through', () => {
  const html = async (markdown: string) => (await renderMarkdown(markdown)).html

  it('drops a script element, block or inline', async () => {
    const out = await html('Before\n\n<script>alert(1)</script>\n\nAfter with <script>alert(2)</script> inline.')
    // The tags go; an inline script's text stays as inert text, so only the tag is held for it.
    expect(out).not.toMatch(/<script/i)
    expect(out).not.toContain('alert(1)')
    expect(out).toContain('Before')
    expect(out).toContain('After with')
  })

  it('drops an image whose onerror handler runs script', async () => {
    const out = await html('<img src=x onerror=alert(1)>\n\ntext <img src=x onerror="alert(2)"> text')
    expect(out).not.toMatch(/onerror/i)
    expect(out).not.toMatch(/<img[^>]*src="?x/i)
    expect(out).not.toContain('alert(')
  })

  it('leaves no javascript: address on a link', async () => {
    const out = await html('[open](javascript:alert(1))')
    expect(out).not.toMatch(/javascript:/i)
  })

  it('still renders ordinary markdown, so the checks above are not satisfied by an empty page', async () => {
    const out = await html('## Heading\n\nA paragraph with **bold** text.')
    expect(out).toContain('Heading')
    expect(out).toContain('<strong>bold</strong>')
  })
})
