import type { Metadata } from 'next'
import { Vazirmatn } from 'next/font/google'
import {
  ModuleSheet,
  sheetMetadata,
  translatedModuleParam,
  type SheetRouteParams,
} from '@/components/sheet/ModuleSheet'

/**
 * M28 — the same module, in Persian.
 *
 * Everything M19 decided for Turkish holds here unchanged, and the Turkish
 * route's docblock carries the reasoning: the language is an ADDRESS and not a
 * preference, the tree holds module pages alone because the language is a
 * property of the module being read, and only modules that HAVE a Persian body
 * get an address. The author's word for this one: *"the persian support should
 * be only at the module content level and not website level such as navbars"*.
 *
 * ## Two things Turkish did not need
 *
 * **Direction.** Persian is right-to-left, so the elements that carry
 * `lang="fa"` also carry `dir="rtl"` (`languages.ts`), and `prose.css` flips
 * what reads and keeps what is drawn — code and figure frames — left-to-right.
 *
 * **A face.** The site sets no downloaded font anywhere but the home page, and
 * the system stack it names has no Persian forms in most of its members, so
 * Persian fell back glyph by glyph to whatever the platform had. Vazirmatn is
 * loaded HERE ONLY, the way the home page loads Fraunces: `next/font` fetches
 * it at build time and serves it from the site, so a reader's browser makes no
 * request to Google. It binds `--font-persian`, which `[lang="fa"]` turns into
 * the sans face for everything Persian on the page. `latin` comes with
 * `arabic` because the technical words stay in English, and a sentence set in
 * two faces at once reads as two sentences.
 *
 * The wrapper is `display: contents`, so it carries the variable and takes no
 * part in layout: the shell's own boxes are still the page's boxes.
 */
const persian = Vazirmatn({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--font-persian',
})

export function generateStaticParams(): SheetRouteParams[] {
  return translatedModuleParam('fa')
}

export function generateMetadata({
  params,
}: {
  params: Promise<SheetRouteParams>
}): Promise<Metadata> {
  return sheetMetadata(params, 'fa')
}

export default function PersianModuleSheetPage({
  params,
}: {
  params: Promise<SheetRouteParams>
}) {
  return (
    <div className={`contents ${persian.variable}`}>
      <ModuleSheet params={params} lang="fa" />
    </div>
  )
}
