import type { Metadata } from 'next'
import { ContinueHero } from '@/components/record/ContinueHero'
import { CourseCompletion, type CompletionLevel } from '@/components/record/CourseCompletion'
import { DataPanel } from '@/components/record/DataPanel'
import { FoldFragment } from '@/components/record/FoldFragment'
import { DATA_READING, QuarantineNote } from '@/components/record/ProfilePanels'
import { Register, RegisterRow } from '@/components/record/Register'
import { PageShell } from '@/components/shell/PageShell'
import { CATEGORIES } from '@/lib/content/curriculum-file'
import { curriculumFacts } from '@/lib/content/facts'
import { sheetRows } from '@/lib/content/manifest'
import { SHORTCUTS } from '@/lib/record/keys'

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
    'Every module and whether you have completed it, and the controls that '
    + 'export, import or erase your progress.',
}

/**
 * Your progress: the level circles, the way back into the module you left, and
 * the one control that keeps the record safe.
 *
 * ## What was removed, and why (2026-11-05)
 *
 * The author, after six readers had used the site: *"I am tired of the unused
 * features or statistics ... you can freely remove them."* So the page lost
 * the account block (the name, "Checked by", the approval marks and their
 * seed, and sign-in), "Waiting on you", and every register row but one: the
 * readout, streak, stamps and submittals, the role path, the curriculum
 * diagram, the record of work, and the settings rows (organisation, last
 * claim, storage, stored values, keyboard).
 *
 * **What stayed, and why each earns its place.** The circles are the page's
 * answer to "how far am I" (M22).
 * The continue card draws nothing until there is a module to go back to.
 * And `Export, import, erase` stays because the record lives only in this
 * browser, which can clear it without warning: a file is the reader's only
 * copy that survives that, and the round-2 playground (F2) keeps it for the
 * same reason. The components behind the removed rows are left in the tree;
 * nothing on this page imports them any more.
 */
export default function ProgressPage() {
  const facts = curriculumFacts()
  const rows = sheetRows()

  /**
   * Every level in curriculum order, with every module in it, planned or not,
   * because the denominator is the level and not the part of it somebody has
   * written (§11.25). The same shape the home page hands it (D14).
   */
  const levels: readonly CompletionLevel[] = CATEGORIES.map((category) => ({
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

  return (
    <PageShell column={false}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="bz-display m-0">Your progress</h1>
        {/* Derived from `SHORTCUTS`, where the chord is defined and handled. */}
        <p className="text-mark m-0 text-on-surface-muted">{PROFILE_CHORD}</p>
      </div>

      <hr className="bz-rule" aria-hidden="true" />

      {/* §12.1.2 — the one surface where a quarantined record can be
          discovered, and the only thing that explains why everything below is
          empty. It renders nothing unless there is one to report. */}
      <QuarantineNote />

      <div className="bz-panel-head">
        <h2 id="progress-levels" className="bz-panel-title">
          Every module
        </h2>
        <p className="bz-panel-note">Yours to set, and to take back</p>
      </div>
      <CourseCompletion facts={facts} levels={levels} headingId="progress-levels" />

      {/* Channel B: nothing to continue draws nothing. */}
      <ContinueHero
        facts={facts}
        levels={Object.fromEntries(CATEGORIES.map((one) => [one.slug, one.title]))}
      />

      {/* `/profile/#data` is an address other surfaces link to, and its id sits
          inside a closed `<summary>`; this island opens the fold it names. */}
      <FoldFragment />

      <div data-bz-register-group="group-data">
        <div className="bz-panel-head">
          <h2 id="group-data" className="bz-panel-title">
            Your data
          </h2>
          <p className="bz-panel-note">Export and import are reversible. Erasing is not</p>
        </div>
        <Register labelledBy="group-data">
          <RegisterRow id="data" name="Export, import, erase" reading={DATA_READING} kind="state">
            <DataPanel />
          </RegisterRow>
        </Register>
      </div>
    </PageShell>
  )
}
