import { buildModuleDoc, docLanguages } from '@/lib/bundle/build'
import { ModuleDoc } from '@/lib/bundle/schema'
import { loadAllModules } from '@/lib/content/loader'

/**
 * `api/v1/modules/<level>/<module>/<lang>.json`: one module in one language,
 * for every language `docLanguages` names, English first (spec 2.5). The file
 * segment carries `.json` for the same reason as the level route's.
 */

export const dynamic = 'force-static'
export const dynamicParams = false

interface Params {
  level: string
  module: string
  file: string
}

export function generateStaticParams(): Params[] {
  return loadAllModules().flatMap((module) => docLanguages(module).map((lang) => ({
    level: module.category.slug,
    module: module.moduleSlug,
    file: `${lang}.json`,
  })))
}

export async function GET(_request: Request, context: { params: Promise<Params> }): Promise<Response> {
  const { level, module: name, file } = await context.params
  const module = loadAllModules().find((one) => one.category.slug === level && one.moduleSlug === name)
  if (module === undefined) throw new Error(`api/v1/modules: "${level}/${name}" is not a module this route generated`)
  const slug = module.slug
  const lang = docLanguages(module).find((one) => `${one}.json` === file)
  if (lang === undefined) throw new Error(`api/v1/modules: "${file}" is not a document of "${slug}" this route generated`)
  return Response.json(ModuleDoc.parse((await buildModuleDoc(slug, lang)).doc))
}
