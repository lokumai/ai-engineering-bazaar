import type { Metadata } from 'next'
import {
  ModuleSheet,
  everyoneModuleParam,
  sheetMetadata,
  type SheetRouteParams,
} from '@/components/sheet/ModuleSheet'

/** D91 — every module's For Everyone page; an unwritten one says so (`NotWritten`). */
export function generateStaticParams(): SheetRouteParams[] {
  return everyoneModuleParam('en')
}

export function generateMetadata({
  params,
}: {
  params: Promise<SheetRouteParams>
}): Promise<Metadata> {
  return sheetMetadata(params, 'en', 'everyone')
}

export default function EveryoneModulePage({
  params,
}: {
  params: Promise<SheetRouteParams>
}) {
  return <ModuleSheet params={params} lang="en" track="everyone" />
}
