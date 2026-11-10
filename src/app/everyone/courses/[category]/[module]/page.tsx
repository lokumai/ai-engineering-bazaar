import type { Metadata } from 'next'
import {
  ModuleSheet,
  everyoneModuleParam,
  sheetMetadata,
  type SheetRouteParams,
} from '@/components/sheet/ModuleSheet'
import { MovedPage, movedMetadata } from '@/components/shell/Moved'
import { movedModuleOf, movedModuleParams } from '@/lib/content/moved'
import { loadModule } from '@/lib/content/loader'
import { moduleRoute } from '@/lib/tracks'

/** D91 — every module's For Everyone page; an unwritten one says so (`NotWritten`). */
export function generateStaticParams(): SheetRouteParams[] {
  // D94 — and every module the curriculum moved, at its old address, as a forward.
  return [...everyoneModuleParam('en'), ...movedModuleParams()]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<SheetRouteParams>
}): Promise<Metadata> {
  const { category, module } = await params
  const to = movedModuleOf(category, module)
  if (to) return Promise.resolve(movedMetadata(movedTitle(to), moduleRoute(to, 'everyone')))
  return sheetMetadata(params, 'en', 'everyone')
}

export default async function EveryoneModulePage({
  params,
}: {
  params: Promise<SheetRouteParams>
}) {
  const { category, module } = await params
  const to = movedModuleOf(category, module)
  if (to) return <MovedPage to={moduleRoute(to, 'everyone')} name={movedTitle(to)} what={`The ${movedTitle(to)} module`} />
  return <ModuleSheet params={params} lang="en" track="everyone" />
}

/** The title of the module a moved address now points at. */
function movedTitle(slug: string): string {
  return loadModule(slug)?.frontmatter.title ?? slug
}
