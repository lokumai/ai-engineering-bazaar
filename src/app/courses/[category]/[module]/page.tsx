import type { Metadata } from 'next'
import {
  ModuleSheet,
  everyModuleParam,
  sheetMetadata,
  type SheetRouteParams,
} from '@/components/sheet/ModuleSheet'
import { MovedPage, movedMetadata } from '@/components/shell/Moved'
import { movedModuleOf, movedModuleParams } from '@/lib/content/moved'
import { loadModule } from '@/lib/content/loader'
import { moduleRoute } from '@/lib/tracks'

/**
 * A module, in English — M19 made this route file four calls.
 *
 * The page itself is `components/sheet/ModuleSheet.tsx`, because a module has
 * two addresses now and the other one renders the same 300 lines. What lives
 * here is what is true of THIS tree and nothing else: which modules it
 * prerenders (all of them), and which language it asks the corpus for.
 *
 * The route does not move and never has. M17 folded the two level listings into
 * the catalog and left this address alone deliberately — a module is the thing
 * the whole site is for, and its URL is the one people send each other.
 */
export function generateStaticParams(): SheetRouteParams[] {
  // D94 — and every module the curriculum moved, at its old address, as a forward.
  return [...everyModuleParam(), ...movedModuleParams()]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<SheetRouteParams>
}): Promise<Metadata> {
  const { category, module } = await params
  const to = movedModuleOf(category, module)
  if (to) return Promise.resolve(movedMetadata(movedTitle(to), moduleRoute(to, 'engineers')))
  return sheetMetadata(params, 'en')
}

export default async function ModuleSheetPage({
  params,
}: {
  params: Promise<SheetRouteParams>
}) {
  const { category, module } = await params
  const to = movedModuleOf(category, module)
  if (to) return <MovedPage to={moduleRoute(to, 'engineers')} name={movedTitle(to)} what={`The ${movedTitle(to)} module`} />
  return <ModuleSheet params={params} lang="en" />
}

/** The title of the module a moved address now points at. */
function movedTitle(slug: string): string {
  return loadModule(slug)?.frontmatter.title ?? slug
}
