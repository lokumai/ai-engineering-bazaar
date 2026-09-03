import type { Metadata } from 'next'
import Link from 'next/link'
import { Lkm01 } from '@/components/mascot/Lkm01'
import { PathStanding } from '@/components/path/PathStanding'
import { PathSteps, type SheetRef, type SheetRefs } from '@/components/path/PathSteps'
import { RolePicker } from '@/components/path/RolePicker'
import { PageShell } from '@/components/shell/PageShell'
import { sheetRows } from '@/lib/content/manifest'
import { PATHS, drawnCount } from '@/lib/path/paths'
import { ROLES } from '@/lib/path/roles'
import { plural } from '@/lib/text'

export const metadata: Metadata = {
  title: 'Path',
  description:
    'An ordered route through the drawing set for each of nine roles, with the '
    + 'reason each sheet is on it and the sheets that are not yet drawn marked '
    + 'as such.',
}

/**
 * §13.4.3 — `/path/`. ONE static page for all nine roles.
 *
 * **No per-role routes, and that is the load-bearing decision.** A static export
 * would prerender a nine-way fan-out once for every reader, which would put
 * eight pages on the site describing somebody else's route. So all nine bodies
 * plus the empty state are in this one document and channel A shows exactly one:
 * `lokum.css` resolves `.hl-path-body[data-role="<id>"]` against the
 * `hl-role-<id>` class the boot script stamps on `<html>` before first paint
 * (§12.2), and `.hl-path-empty` against the absence of all nine. That is what
 * makes the page correct in frame one for a reader with a role and for one
 * without — and it is why nothing here is gated behind React state.
 *
 * **A server page, and that is load-bearing rather than incidental** — the same
 * shape as `/dashboard/` and `/profile/`. It measures the corpus with
 * `sheetRows()`, which reaches `node:fs` through the loader, and hands the
 * result down as plain data. §12.2's import rule is that a single value carried
 * across that line pulls `node:fs` into the browser bundle and stops the build,
 * so the boundary is drawn here, at the page, and nowhere lower: `PathSteps` is
 * server markup, and the two islands below take serialised props.
 *
 * **The empty state is honest** (§12.13's fifth class, added by §13.14). A
 * reader with no role gets the readout, the cue, one path out, and the nine-role
 * picker with each blurb and each path's drawn-step count — and NO path drawn,
 * because there is no path to draw. Never a sample path, never a placeholder:
 * a drawn route for a role the reader has not chosen is a page claiming a state
 * that is not true of them (§1).
 *
 * **The picker sits outside the ten blocks**, in its own panel, so it is on
 * screen in both states. Two things follow from that and both are the reason
 * for it: a reader with a role can change it here without §13.3's warning that
 * does not exist, and the `role="status"` line inside the picker survives the
 * choice — channel A hides the empty state the instant the record is written, so
 * an announcement rendered inside it would be removed before it was read
 * (SC 4.1.3).
 *
 * **What this page deliberately does not do.** It does not gate anything
 * (§13.4.4): every sheet stays reachable from `/courses/`, keeps its own
 * sign-off control, and a reader with no role has the whole corpus exactly as
 * Phase 2 left it. It awards nothing — a role earns no XP and a path no stamp
 * (§12.5.1, unamended). And it prints no percentage anywhere (§11.35): the
 * standing is a count, framed to-go.
 */

/** §11.25 — every title, number and route measured from the corpus, none typed. */
function sheetRefs(): SheetRefs {
  const refs: Record<string, SheetRef> = {}
  for (const row of sheetRows()) {
    refs[row.slug] = {
      title: row.title,
      path: row.path,
      number: row.number,
      module: row.module,
      subsystem: row.subsystem.title,
      drawn: row.drawn,
    }
  }
  return refs
}

export default function PathPage() {
  const sheets = sheetRefs()

  // §13.4.2's denominator, measured once here and handed down. `lib/path/` can
  // never work this out for itself: `status: ready` lives in the markdown and
  // reading it needs `node:fs`, which the two islands below cannot have (§12.2).
  const drawnSlugs = Object.entries(sheets)
    .filter(([, sheet]) => sheet.drawn)
    .map(([slug]) => slug)
  const drawnSet = new Set(drawnSlugs)

  // §11.25 — measured here rather than written into the sentence. The set has
  // been renumbered before and seventeen sheets are drafts today; a typed
  // number would survive the day that changes.
  const all = Object.values(sheets)
  const undrawn = all.filter((sheet) => !sheet.drawn).length

  return (
    <PageShell>
      <h1 className="hl-listing-title">Path</h1>

      <p className="hl-lead">
        An ordered route through the drawing set for each of nine roles. Each
        step names the sheet, why that role reads it, and whether the sheet is
        drawn yet — {undrawn} of the {all.length} are not, and a step pointing at
        one of those says so and links to nothing. A path recommends an order; it
        does not gate anything, and every sheet stays reachable from the drawing
        set.
      </p>

      <hr className="hl-rule-struct" aria-hidden="true" />

      {/* ---- THE EMPTY STATE (§12.13's fifth class) ----------------------- */}
      {/* Shown by channel A when no `hl-role-*` class is stamped, which is the
          only condition under which every word in it is true. */}
      <div className="hl-path-empty">
        <div className="hl-empty" data-hl-empty="role-absent">
          <p className="hl-mark hl-empty-status m-0">NO ROLE SET</p>
          <p className="hl-empty-cue">
            A path is an ordered list of sheets for one role, with a reason
            against each step. Choosing a role draws yours here, and the nine
            options are below with what each path covers.
          </p>
          <a className="hl-btn hl-empty-path" href="#role">
            Choose a role
          </a>
        </div>
      </div>

      {/* ---- THE NINE BODIES (§13.4.3 item 2) ---------------------------- */}
      {/* All nine are prerendered. Eight are `display: none` for any given
          reader, and which eight is a fact about the reader that only the boot
          script's stamp knows — never this build, and never React. */}
      {ROLES.map((role) => {
        const path = PATHS.find((candidate) => candidate.role === role.id)
        if (path === undefined) return null

        return (
          <section
            key={role.id}
            className="hl-path-body"
            data-role={role.id}
            data-hl-path={role.id}
            aria-labelledby={`path-${role.id}`}
          >
            <div className="mb-6 flex flex-wrap items-start gap-6">
              {/* §13.2 — 128px, the size §8.3 as amended gives a path hero. The
                  drawing is `aria-hidden` at every size (§12.18) and reports
                  nothing this page does not also state in text. */}
              <Lkm01 size={128} idPrefix={`path-${role.id}`} className="shrink-0" />

              <div className="min-w-0 flex-1">
                <h2 id={`path-${role.id}`} className="hl-mark m-0 text-ink">
                  {role.label}
                </h2>
                <p className="mt-2 mb-3 max-w-[68ch] font-display text-meta leading-normal text-ink-muted">
                  {role.blurb}
                </p>

                {/* Channel B: the tally, and the marker on the next step. */}
                <PathStanding role={role.id} drawnSlugs={drawnSlugs} />

                {/* §13.4.2 — the denominator, stated where the reader can see
                    what it excludes. Derived, never typed (§11.25). */}
                <p className="hl-mark mt-2 mb-0 text-ink-faint">
                  {plural(path.steps.length, 'step')} ·{' '}
                  {plural(drawnCount(path, drawnSet), 'sheet')} drawn
                </p>
              </div>
            </div>

            <PathSteps path={path} sheets={sheets} />
          </section>
        )
      })}

      {/* ---- THE PICKER -------------------------------------------------- */}
      {/* Outside the ten blocks, so it is on screen whether or not a role is
          set: it is the empty state's one path out, and the affordance §13.3
          asks for to change a role without a confirmation dialog. */}
      <section className="hl-panel mt-8" id="role" aria-labelledby="role-head">
        <div className="hl-panel-head">
          {/* Not "Role": `RolePicker`'s own `<legend>` says that, and it is the
              group's accessible name (`aria-labelledby`), so it cannot be
              dropped. Two identical labels stacked one above the other is what
              the page actually rendered. This one names the section instead. */}
          <h2 id="role-head" className="hl-panel-title">
            The nine roles
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Never inferred</p>
        </div>

        {/* `role={null}` is the prerender's answer and the only honest one a
            static page can give: it has never met this reader, and null is the
            record's own default (§13.3). The island follows the record once the
            store has answered. */}
        <RolePicker role={null} drawnSlugs={drawnSlugs} />

        <p className="mt-3 mb-0 font-display text-meta leading-normal text-ink-muted">
          The whole set stays where it is:{' '}
          <Link className="hl-link" href="/courses/">
            the drawing set
          </Link>{' '}
          lists every sheet, and every sheet keeps its own sign-off control
          whether or not it is on your path.
        </p>
      </section>
    </PageShell>
  )
}
