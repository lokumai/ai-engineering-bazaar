import type { Metadata } from 'next'
import {
  ModuleSheet,
  everyoneModuleParam,
  sheetMetadata,
  type SheetRouteParams,
} from '@/components/sheet/ModuleSheet'

/** D91 — the For Everyone page of every module with a page in this language; an unwritten one says so (`NotWritten`). */
export function generateStaticParams(): SheetRouteParams[] {
  return everyoneModuleParam('tr')
}

export function generateMetadata({
  params,
}: {
  params: Promise<SheetRouteParams>
}): Promise<Metadata> {
  return sheetMetadata(params, 'tr', 'everyone')
}

export default function EveryoneModulePage({
  params,
}: {
  params: Promise<SheetRouteParams>
}) {
  return <ModuleSheet params={params} lang="tr" track="everyone" />
}
