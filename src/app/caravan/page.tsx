import type { Metadata } from 'next'
import { canonicalOf } from '@/lib/content/seo'
import { CaravanPage } from '@/components/caravan/CaravanPage'
import { sampleInput } from '@/components/caravan/sample-trends'
import { PageShell } from '@/components/shell/PageShell'
import { monthOfDate } from '@/lib/caravan-months'
import { caravanView, inputFromFiles, moduleLink, showsSample } from '@/lib/content/caravan'
import { loadCaravanFiles } from '@/lib/content/caravan-file'
import { CURRICULUM_MODULES } from '@/lib/content/curriculum-file'

/**
 * Caravan (M62, M91, D116): what was trending in AI engineering, month by month since the chatbot
 * moment, drawn as C4, Shadow Play. A page of its own and not a level, in the bar after Progress.
 *
 * **Its content is the author's file, `mini-courses/caravan/trends.yaml`, validated here at build
 * time** (`caravan-file.ts`), with the strength the pipeline measured beside it in `strength.yaml`.
 * Until that file holds a trend, the page draws the placeholder sample in
 * `components/caravan/sample-trends.ts` and says so on its notice and on every trend; the first real
 * trend replaces the sample whole, never mixed with it.
 *
 * The clock is read here, at the edge, once: the latest month a trend may name, and where an open
 * trend's road ends before anything is measured.
 */
const modules = new Map(CURRICULUM_MODULES.map((module) => [module.name, module]))
const latest = monthOfDate(new Date())
const files = loadCaravanFiles({ modules: new Set(modules.keys()), latest })
const view = caravanView(
  !showsSample(files.trends)
    ? inputFromFiles(files.trends, files.strength, modules, latest)
    : sampleInput((name) => {
      const module = modules.get(name)
      return module === undefined ? null : moduleLink(module)
    }),
)

export const metadata: Metadata = {
  title: 'Caravan',
  description: 'What was trending in AI engineering, month by month since the chatbot moment.',
  alternates: canonicalOf('/caravan/'),
  // D120: a page of sample data is not indexed; the first real trend lifts this.
  robots: showsSample(files.trends) ? { index: false, follow: true } : undefined,
}

export default function CaravanRoute() {
  return (
    <PageShell column={false}>
      <CaravanPage view={view} />
    </PageShell>
  )
}
