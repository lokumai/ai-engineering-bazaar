import { buildModuleDoc, docLanguages } from '@/lib/bundle/build'
import { courseImageSize } from '@/lib/bundle/image-size'
import { ModuleDoc } from '@/lib/bundle/schema'
import { loadAllModules } from '@/lib/content/loader'

/**
 * `api/v1/modules/<level>/<module>/everyone/<lang>.json`: one module's For
 * Everyone version in one language (D91), for every language `docLanguages`
 * names in that track. A module whose For Everyone file is not written has
 * none, as it has no For Everyone page on the web.
 */

export const dynamic = 'force-static'
export const dynamicParams = false

interface Params {
  level: string
  module: string
  file: string
}

export function generateStaticParams(): Params[] {
  return loadAllModules().flatMap((module) => docLanguages(module, 'everyone').map((lang) => ({
    level: module.category.slug,
    module: module.moduleSlug,
    file: `${lang}.json`,
  })))
}

export async function GET(_request: Request, context: { params: Promise<Params> }): Promise<Response> {
  const { level, module: name, file } = await context.params
  const module = loadAllModules().find((one) => one.category.slug === level && one.moduleSlug === name)
  if (module === undefined) throw new Error(`api/v1/modules: "${level}/${name}" is not a module this route generated`)
  const lang = docLanguages(module, 'everyone').find((one) => `${one}.json` === file)
  if (lang === undefined) throw new Error(`api/v1/modules: "everyone/${file}" is not a document of "${module.slug}" this route generated`)
  return Response.json(ModuleDoc.parse((await buildModuleDoc(module.slug, lang, courseImageSize, 'everyone')).doc))
}
