import { z } from 'zod'
import { CATEGORIES } from './categories'

const categorySlugs = CATEGORIES.map((c) => c.slug) as [string, ...string[]]

const base = z.object({
  module: z.number().int().positive(),
  title: z.string().min(1),
  category: z.enum(categorySlugs),
  status: z.enum(['ready', 'draft']),
  duration: z.number().int().nonnegative().default(0),
  summary: z.string().min(1).nullable().default(null),
  objectives: z.array(z.string().min(1)).default([]),
  prerequisites: z.array(z.number().int().positive()).default([]),
})

export const moduleFrontmatterSchema = base
  .refine((v) => v.status !== 'ready' || v.summary !== null, {
    path: ['summary'],
    message: 'a ready module needs a summary',
  })
  .refine((v) => v.status !== 'ready' || v.objectives.length >= 2, {
    path: ['objectives'],
    message: 'a ready module needs at least two objectives',
  })
  .refine((v) => v.status !== 'ready' || v.duration > 0, {
    path: ['duration'],
    message: 'a ready module needs an estimated duration in minutes',
  })

export type ModuleFrontmatter = z.infer<typeof moduleFrontmatterSchema>

export function parseFrontmatter(raw: unknown, source: string): ModuleFrontmatter {
  const result = moduleFrontmatterSchema.safeParse(raw)
  if (result.success) return result.data
  const detail = result.error.issues
    .map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n')
  throw new Error(`Invalid frontmatter in ${source}:\n${detail}`)
}
