import type { Metadata } from 'next'
import {
  ModuleSheet,
  everyoneModuleParam,
  sheetMetadata,
  type SheetRouteParams,
} from '@/components/sheet/ModuleSheet'

/** D91 — a module's For Everyone page, only where that version is written. */
export function generateStaticParams(): SheetRouteParams[] {
  return everyoneModuleParam('fa')
}

export function generateMetadata({
  params,
}: {
  params: Promise<SheetRouteParams>
}): Promise<Metadata> {
  return sheetMetadata(params, 'fa', 'everyone')
}

export default function EveryoneModulePage({
  params,
}: {
  params: Promise<SheetRouteParams>
}) {
  return <ModuleSheet params={params} lang="fa" track="everyone" />
}
