import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '@/lib/content/render'
import { isSafeHref } from '@/lib/content/safe-href'

describe('isSafeHref: an allowlist of schemes', () => {
  it.each([
    'https://example.com/a?b=c#d',
    'HTTP://example.com',
    'mailto:someone@example.com',
    '#section',
    'security.md',
    './images/a.png',
    '../3_expert/advanced.md',
    '/courses/intermediate/security/',
    '//example.com/path',
    '',
  ])('lets %j through', (href) => {
    expect(isSafeHref(href)).toBe(true)
  })

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    '  javascript:alert(1)',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    '\u0001javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'blob:https://example.com/x',
    'tel:+10000000',
    'ftp://example.com',
    'anything-new:whatever',
  ])('refuses %j', (href) => {
    expect(isSafeHref(href)).toBe(false)
  })
})

describe('a link the renderer meets', () => {
  const hrefsOf = (html: string) => [...html.matchAll(/<a(?: [^>]*)?>/g)].map(([tag]) => tag)

  it('keeps its text and loses its address when the scheme is not on the list', async () => {
    const { html } = await renderMarkdown('[Click here](javascript:alert(1)) and [fine](https://example.com).')
    expect(html).toContain('Click here')
    expect(html).not.toMatch(/javascript:/i)
    const [bad, good] = hrefsOf(html)
    expect(bad).not.toContain('href')
    expect(good).toContain('href="https://example.com"')
  })

  it('refuses the same schemes however they are dressed', async () => {
    for (const url of ['JAVASCRIPT:alert(1)', 'data:text/html;base64,AAAA', 'vbscript:x', '&#106;avascript:alert(1)']) {
      const { html } = await renderMarkdown(`[x](<${url}>)`)
      expect(html, url).not.toMatch(/href="[^"]*(script|data):/i)
    }
  })

  it('does not draw a call-out button from a link it has just neutralised', async () => {
    const { html } = await renderMarkdown('> [!IMPORTANT]\n> **Title**\n>\n> **[Go](javascript:alert(1))**')
    expect(html).toContain('bz-callout')
    expect(html).not.toMatch(/javascript:/i)
    expect(html).not.toContain('bz-btn')
  })

  it('draws the button for an address on the list', async () => {
    const { html } = await renderMarkdown('> [!IMPORTANT]\n> **Title**\n>\n> **[Go](https://example.com)**')
    expect(html).toContain('bz-btn')
  })

  it('leaves a relative course link and a fragment alone', async () => {
    const { html } = await renderMarkdown('[a](#x) and [b](./y)')
    expect(html).toContain('href="#x"')
    expect(html).toContain('href="./y"')
  })
})
