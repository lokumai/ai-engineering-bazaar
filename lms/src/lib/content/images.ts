import type { CategorySlug } from './categories'

export function imageBaseFor(category: CategorySlug): string {
  const basePath = process.env.NEXT_PUBLIC_LMS_BASE_PATH ?? ''
  return `${basePath}/course-images/${category}`
}
