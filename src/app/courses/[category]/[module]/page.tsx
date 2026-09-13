import type { Metadata } from 'next'
import {
  ModuleSheet,
  everyModuleParam,
  sheetMetadata,
  type SheetRouteParams,
} from '@/components/sheet/ModuleSheet'

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
  return everyModuleParam()
}

export function generateMetadata({
  params,
}: {
  params: Promise<SheetRouteParams>
}): Promise<Metadata> {
  return sheetMetadata(params, 'en')
}

export default function ModuleSheetPage({
  params,
}: {
  params: Promise<SheetRouteParams>
}) {
  return <ModuleSheet params={params} lang="en" />
}
