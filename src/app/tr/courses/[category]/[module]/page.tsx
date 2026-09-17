import type { Metadata } from 'next'
import {
  ModuleSheet,
  sheetMetadata,
  translatedModuleParam,
  type SheetRouteParams,
} from '@/components/sheet/ModuleSheet'

/**
 * M19 — the same module, in Turkish.
 *
 * ## Why the language is an ADDRESS and not a preference
 *
 * Two shapes were costed. A route segment gives every translated module a
 * sibling URL: `<html lang>` follows the segment, a search engine sees two
 * documents, and **a reader can send somebody a Turkish link** — which is the
 * thing a preference can never do. The alternative put the language on the
 * record, which costs no files and cannot be shared, needs channel A to be
 * right in frame one, and shows a crawler one language.
 *
 * It is the same argument M17 made when a level became an address (**D62**),
 * and the same one that made the catalog's level chips links: the shape that
 * works with the bundle blocked is the shape that works.
 *
 * ## Why only modules, and not a second site
 *
 * The author placed the control: *"Language of each module should be selectable
 * from the top-right corner of the box which contains the whole center-aligned
 * module content."* **The language is a property of the module being read**,
 * not of the site — so the chrome, the catalog and the progress page have one
 * address each and this tree holds module pages alone.
 *
 * ## Why only the translated ones
 *
 * `translatedModuleParam` filters on the corpus, so a module with no usable
 * translation has no Turkish address at all and a hand-edited URL 404s.
 * **MEASURED: 19 of 33** — every written module, because §7.6 forces a draft to
 * `EN` whatever its stub sibling says. Serving English at a Turkish address
 * would be the quieter failure and the worse one: §1 refuses a control that
 * claims something the page cannot do, and an address is a claim.
 */
export function generateStaticParams(): SheetRouteParams[] {
  return translatedModuleParam()
}

export function generateMetadata({
  params,
}: {
  params: Promise<SheetRouteParams>
}): Promise<Metadata> {
  return sheetMetadata(params, 'tr')
}

export default function TurkishModuleSheetPage({
  params,
}: {
  params: Promise<SheetRouteParams>
}) {
  return <ModuleSheet params={params} lang="tr" />
}
