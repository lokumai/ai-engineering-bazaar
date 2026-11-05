import type { Metadata } from 'next'
import { CourseCompletion, type CompletionLevel } from '@/components/record/CourseCompletion'
import { DataPanel } from '@/components/record/DataPanel'
import { ProgressTabs } from '@/components/record/ProgressTabs'
import { QuarantineNote } from '@/components/record/ProfilePanels'
import { PageShell } from '@/components/shell/PageShell'
import { CATEGORIES } from '@/lib/content/curriculum-file'
import { curriculumFacts } from '@/lib/content/facts'
import { sheetRows } from '@/lib/content/manifest'
import { SHORTCUTS } from '@/lib/record/keys'
import type { Track } from '@/lib/tracks'

/**
 * The chord that reaches this page, read from the one place it is defined.
 * `SHORTCUTS` is what the key handler dispatches on, so printing anything else
 * here would tell a reader a chord that does nothing.
 */
const PROFILE_CHORD =
  SHORTCUTS.find((shortcut) => shortcut.target === 'profile')?.keys.toUpperCase() ?? ''

export const metadata: Metadata = {
  title: 'Your progress',
  description:
    'Every module in both tracks and whether you have completed it, and how to '
    + 'back up, restore or reset your progress.',
}

/**
 * Your progress, as the author picked it in round 2 (M39 F2): two tabs, one per
 * track, each with its count and its five level cards, and under them one quiet
 * line with Back up, Restore and Reset.
 *
 * ## What changed, and why (2026-11-05)
 *
 * M38 had left the level cards, the continue card and the register's data row.
 * F2 is the whole page: the continue card and the three-figure stats row went,
 * and the data row became one line, because the record lives only in this
 * browser and a backup file is the one copy that survives a cleared browser.
 * Progress is per track (D86), so each tab's cards show and write that track.
 *
 * `/profile/#data` is still the address of the data line: the legend links to it.
 */
export default function ProgressPage() {
  const facts = { engineers: curriculumFacts('engineers'), everyone: curriculumFacts('everyone') }

  /**
   * Every level in curriculum order, with every module in it, written or not,
   * because the denominator is the level and not the part of it somebody has
   * written (§11.25).
   */
  const levelsOf = (track: Track): readonly CompletionLevel[] => {
    const rows = sheetRows(track)
    return CATEGORIES.map((category) => ({
      slug: category.slug,
      title: category.title,
      order: category.order,
      modules: rows
        .filter((row) => row.subsystem.slug === category.slug)
        .map((row) => ({
          slug: row.slug,
          module: row.module,
          title: row.title,
          path: row.path,
          drawn: row.drawn,
        })),
    }))
  }

  const panel = (track: Track) => (
    <>
      <h2 id={`progress-levels-${track}`} className="sr-only">
        Every module, {track === 'engineers' ? 'For Engineers' : 'For Everyone'}
      </h2>
      <CourseCompletion
        facts={facts[track]}
        levels={levelsOf(track)}
        headingId={`progress-levels-${track}`}
        track={track}
      />
    </>
  )

  return (
    <PageShell column={false}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="bz-display m-0">Your progress</h1>
        {/* Derived from `SHORTCUTS`, where the chord is defined and handled. */}
        <p className="text-mark m-0 text-on-surface-muted">{PROFILE_CHORD}</p>
      </div>

      {/* §12.1.2 — the one surface where a quarantined record can be
          discovered, and the only thing that explains why everything below is
          empty. It renders nothing unless there is one to report. */}
      <QuarantineNote />

      <ProgressTabs
        facts={facts}
        panels={{ engineers: panel('engineers'), everyone: panel('everyone') }}
      />

      <section id="data" aria-label="Your data" className="bz-dataline-wrap">
        <DataPanel />
      </section>
    </PageShell>
  )
}
