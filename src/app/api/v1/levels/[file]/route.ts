import { buildLevelDoc } from '@/lib/bundle/build'
import { LevelDoc } from '@/lib/bundle/schema'
import { CATEGORIES } from '@/lib/content/curriculum-file'

/**
 * `api/v1/levels/<level>.json`: a level's introduction as blocks, for every
 * level that has one (spec 2.5). A level without an introduction has no file,
 * and the index says so with `readme: null`.
 *
 * The segment is the whole file name, `.json` included, because a static
 * export writes the param as the file's name; a `[level]` segment under a
 * `.json` folder would be written as a directory.
 */

export const dynamic = 'force-static'
export const dynamicParams = false

interface Params {
  file: string
}

export async function generateStaticParams(): Promise<Params[]> {
  const params: Params[] = []
  for (const category of CATEGORIES) {
    if (await buildLevelDoc(category.slug) !== null) params.push({ file: `${category.slug}.json` })
  }
  return params
}

export async function GET(_request: Request, context: { params: Promise<Params> }): Promise<Response> {
  const { file } = await context.params
  if (!file.endsWith('.json')) throw new Error(`api/v1/levels: "${file}" is not a level document this route generated`)
  const slug = file.slice(0, -'.json'.length)
  if (!CATEGORIES.some((category) => category.slug === slug)) {
    throw new Error(`api/v1/levels: "${file}" is not a level document this route generated`)
  }
  const built = await buildLevelDoc(slug)
  if (built === null) throw new Error(`api/v1/levels: "${file}" names level "${slug}", which has no introduction`)
  return Response.json(LevelDoc.parse(built.doc))
}
