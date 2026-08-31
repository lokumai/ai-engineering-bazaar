import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Prose } from '@/components/course/Prose'

describe('Prose', () => {
  it('puts the rendered markup inside the scoped prose class', () => {
    const markup = renderToStaticMarkup(<Prose html="<p>Body.</p>" />)
    expect(markup).toContain('class="prose"')
    expect(markup).toContain('<p>Body.</p>')
  })

  it('marks the column so the enhancements can find it', () => {
    expect(renderToStaticMarkup(<Prose html="" />)).toContain('data-hl-prose')
  })

  it('lets a sheet layout add its own class without losing the prose rules', () => {
    const markup = renderToStaticMarkup(<Prose html="" className="mt-8" />)
    expect(markup).toContain('class="prose mt-8"')
  })
})
