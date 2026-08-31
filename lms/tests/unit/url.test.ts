import { afterEach, describe, expect, it } from 'vitest'
import { href } from '@/lib/url'

describe('href', () => {
  const original = process.env.NEXT_PUBLIC_LMS_BASE_PATH
  afterEach(() => { process.env.NEXT_PUBLIC_LMS_BASE_PATH = original })

  it('returns the path unchanged with no base path', () => {
    process.env.NEXT_PUBLIC_LMS_BASE_PATH = ''
    expect(href('/fundamentals/llms/')).toBe('/fundamentals/llms/')
  })

  it('treats an unset base path as empty', () => {
    delete process.env.NEXT_PUBLIC_LMS_BASE_PATH
    expect(href('/fundamentals/')).toBe('/fundamentals/')
  })

  it('prefixes the base path', () => {
    process.env.NEXT_PUBLIC_LMS_BASE_PATH = '/ai-engineering-bazaar/lms'
    expect(href('/fundamentals/llms/'))
      .toBe('/ai-engineering-bazaar/lms/fundamentals/llms/')
  })

  it('normalises a path given without a leading slash', () => {
    process.env.NEXT_PUBLIC_LMS_BASE_PATH = '/lms'
    expect(href('fundamentals/')).toBe('/lms/fundamentals/')
  })

  it('maps the site root to the base path itself', () => {
    process.env.NEXT_PUBLIC_LMS_BASE_PATH = '/lms'
    expect(href('/')).toBe('/lms/')
  })

  it('leaves external URLs untouched', () => {
    process.env.NEXT_PUBLIC_LMS_BASE_PATH = '/lms'
    expect(href('https://github.com/lokumai/ai-engineering-bazaar'))
      .toBe('https://github.com/lokumai/ai-engineering-bazaar')
  })

  it('leaves protocol-relative and mailto URLs untouched', () => {
    process.env.NEXT_PUBLIC_LMS_BASE_PATH = '/lms'
    expect(href('//fonts.googleapis.com/x')).toBe('//fonts.googleapis.com/x')
    expect(href('mailto:hello@example.com')).toBe('mailto:hello@example.com')
  })

  it('leaves a bare fragment untouched, so in-page anchors keep working', () => {
    process.env.NEXT_PUBLIC_LMS_BASE_PATH = '/lms'
    expect(href('#main')).toBe('#main')
  })

  it('does not double up when the base path is already present', () => {
    process.env.NEXT_PUBLIC_LMS_BASE_PATH = '/lms'
    expect(href('/lms/fundamentals/')).toBe('/lms/fundamentals/')
  })
})
