import { afterEach, describe, expect, it } from 'vitest'
import { imageBaseFor } from '@/lib/content/images'

describe('imageBaseFor', () => {
  const original = process.env.NEXT_PUBLIC_LMS_BASE_PATH
  afterEach(() => { process.env.NEXT_PUBLIC_LMS_BASE_PATH = original })

  it('builds a root-relative path in local development', () => {
    process.env.NEXT_PUBLIC_LMS_BASE_PATH = ''
    expect(imageBaseFor('fundamentals')).toBe('/course-images/fundamentals')
  })

  it('includes the deploy base path so sub-path hosting works', () => {
    process.env.NEXT_PUBLIC_LMS_BASE_PATH = '/ai-engineering-bazaar/lms'
    expect(imageBaseFor('fundamentals'))
      .toBe('/ai-engineering-bazaar/lms/course-images/fundamentals')
  })
})
