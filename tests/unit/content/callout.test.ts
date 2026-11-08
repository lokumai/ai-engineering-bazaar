import { describe, expect, it } from 'vitest'
import { CALLOUT_KINDS, calloutKindOf, withoutCalloutMarkers } from '@/lib/content/callout'
import { renderMarkdown } from '@/lib/content/render'

const render = async (markdown: string) => (await renderMarkdown(markdown)).html

describe('a call-out written as a GitHub alert', () => {
  it.each(CALLOUT_KINDS)('is a call-out of its own kind: %s', async (kind) => {
    const html = await render(`> [!${kind.toUpperCase()}]\n> **Title**\n>\n> Body.`)
    expect(html).toContain('class="bz-quote bz-callout"')
    expect(html).toContain(`data-hl-callout="${kind}"`)
  })

  it('loses its marker, so a reader never meets the syntax', async () => {
    const html = await render('> [!IMPORTANT]\n> **Title**\n>\n> Body.')
    expect(html).toContain('bz-callout')
    expect(html).not.toContain('[!')
    expect(html).not.toContain('IMPORTANT')
  })

  it('takes the marker in any case, and keeps the first line as the title', async () => {
    const html = await render('> [!warning]\n> **Stop**\n>\n> Body.')
    expect(html).toContain('data-hl-callout="warning"')
    expect(html).toMatch(/<p class="bz-callout-title"[^>]*><strong>Stop<\/strong><\/p>/)
  })

  it('draws a last paragraph that is only a link as a button, bold or plain', async () => {
    for (const link of ['**[Go](https://example.com/a)**', '[Go](https://example.com/a)']) {
      const html = await render(`> [!IMPORTANT]\n> **Title**\n>\n> Body.\n>\n> ${link}`)
      const cta = /<p class="bz-callout-cta">(<a [^>]*>)/.exec(html)?.[1] ?? ''
      expect(cta, link).toContain('class="bz-btn"')
      expect(cta, link).toContain('href="https://example.com/a"')
      expect(html, link).not.toContain('<strong><a')
    }
  })

  it('leaves a link inside a sentence as a link', async () => {
    const html = await render('> [!NOTE]\n> **Title**\n>\n> Read [the docs](https://example.com) first.')
    expect(html).toContain('bz-callout')
    expect(html).not.toContain('bz-btn')
    expect(html).not.toContain('bz-callout-cta')
  })

  it('does not turn a bold link with other words around it into a button', async () => {
    for (const bold of ['**See [the docs](https://example.com) now**', '**[the docs](https://example.com) now**']) {
      const html = await render(`> [!NOTE]\n> **Title**\n>\n> ${bold}`)
      expect(html, bold).toContain('bz-callout')
      expect(html, bold).not.toContain('bz-btn')
    }
  })

  it('never makes a button of the title line', async () => {
    const html = await render('> [!NOTE]\n> **[Title](https://example.com)**')
    expect(html).toContain('bz-callout')
    expect(html).not.toContain('bz-btn')
  })
})

describe('what a call-out says to assistive software', () => {
  it('is a note named by its own title, not a quotation', async () => {
    const html = await render('> [!IMPORTANT]\n> **Take the course**\n>\n> Body.')
    const quote = /<blockquote [^>]*>/.exec(html)?.[0] ?? ''
    expect(quote).toContain('role="note"')
    const labelled = /aria-labelledby="([^"]+)"/.exec(quote)?.[1]
    expect(labelled, 'the note has no name').toBeTruthy()
    // the name points at the element that carries it
    expect(html).toMatch(new RegExp(`<p class="bz-callout-title" id="${labelled}">`))
  })

  it('gives two call-outs on one page two different names', async () => {
    const html = await render('> [!NOTE]\n> **One**\n\ntext\n\n> [!NOTE]\n> **Two**')
    const ids = [...html.matchAll(/aria-labelledby="([^"]+)"/g)].map(([, id]) => id)
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
  })

  it('leaves an ordinary quote a quote', async () => {
    const html = await render('> A plain quote.')
    expect(html).not.toContain('role="note"')
  })
})

describe('where the marker may stand, as GitHub reads it', () => {
  it('is a call-out only when the marker is alone on its line', async () => {
    const html = await render('> [!NOTE] A title on the marker line')
    expect(html).not.toContain('bz-callout')
    // it prints as it was written, which is what the corpus check refuses to ship
    expect(html).toContain('[!NOTE]')
  })

  it('leaves no empty title when the marker is alone in its paragraph', async () => {
    const html = await render('> [!NOTE]\n>\n> **The title is the next paragraph**\n>\n> Body.')
    expect(html).toContain('bz-callout')
    expect(html).not.toMatch(/<p class="bz-callout-title"[^>]*><\/p>/)
    expect(html).toMatch(/<p class="bz-callout-title"[^>]*><strong>The title is the next paragraph<\/strong><\/p>/)
  })

  it('drops the line break that two trailing spaces after the marker leave', async () => {
    const html = await render('> [!NOTE]  \n> **Title**\n>\n> Body.')
    expect(html).toContain('bz-callout')
    expect(html).not.toContain('<br')
  })
})

describe('a quote that is not an alert', () => {
  it('stays a quote', async () => {
    const html = await render('> A plain quote.')
    expect(html).toContain('class="bz-quote"')
    expect(html).not.toContain('bz-callout')
  })

  it('keeps its bold label', async () => {
    const html = await render('> **Note:** a labelled quote.')
    expect(html).toContain('bz-quote-label')
    expect(html).not.toContain('bz-callout')
  })

  it('is not a call-out when the marker is not first, or not a kind', async () => {
    expect(await render('> Text first [!NOTE] and more.')).not.toContain('bz-callout')
    expect(await render('> [!SHOUT]\n> **Title**')).not.toContain('bz-callout')
  })
})

describe('the marker, outside the renderer', () => {
  it('names a kind only at the start of a text, alone on its line', () => {
    expect(calloutKindOf('[!TIP]\nBody')).toBe('tip')
    expect(calloutKindOf('[!TIP]')).toBe('tip')
    expect(calloutKindOf('Body [!TIP]')).toBeNull()
    expect(calloutKindOf('[!TIP] and more on the line')).toBeNull()
  })

  it('is taken out of text for the search index wherever it stands', () => {
    expect(withoutCalloutMarkers('[!IMPORTANT]\nTake the course').trim()).toBe('Take the course')
    expect(withoutCalloutMarkers('[!NOTE]Title').trim()).toBe('Title')
    expect(withoutCalloutMarkers('no marker here')).toBe('no marker here')
  })
})
