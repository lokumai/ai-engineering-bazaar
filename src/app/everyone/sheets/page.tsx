import type { Metadata } from 'next'
import { canonicalOf } from '@/lib/content/seo'
import { Catalog } from '@/components/catalog/Catalog'
import { SignOffMarks } from '@/components/record/SignOffMarks'
import { PageShell } from '@/components/shell/PageShell'
import { curriculumFacts } from '@/lib/content/facts'
import { sheetRows } from '@/lib/content/manifest'

export const metadata: Metadata = {
  title: 'Catalog, For Everyone',
  description:
    'Every module in the course in plain words, for readers with no technical background.',
  alternates: canonicalOf('/everyone/sheets/'),
}

/**
 * D91 — the For Everyone catalog: the same 33 modules, in the same order, each
 * a link where its For Everyone version is written and planned where it is not.
 * The For Engineers catalog (`/sheets/`) carries the reasoning for the layout.
 */
export default function EveryoneCatalogPage() {
  return (
    <PageShell column={false} track="everyone">
      <h1 className="bz-display">Catalog</h1>
      <Catalog rows={sheetRows('everyone')} label="The catalog" track="everyone" />
      <SignOffMarks facts={curriculumFacts('everyone')} track="everyone" />
    </PageShell>
  )
}
