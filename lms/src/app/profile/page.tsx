import type { Metadata } from 'next'
import { DataPanel } from '@/components/record/DataPanel'
import { IdentityPanel } from '@/components/record/IdentityPanel'
import {
  CharKeysToggle,
  QuarantineNote,
  RawValues,
  StoragePanel,
  SubmittalRegister,
} from '@/components/record/ProfilePanels'
import { Readout } from '@/components/record/Readout'
import { StampShelf } from '@/components/record/StampShelf'
import { Uptime } from '@/components/record/Uptime'
import { PageShell } from '@/components/shell/PageShell'
import { curriculumFacts } from '@/lib/content/facts'

export const metadata: Metadata = {
  title: 'Profile',
  description:
    "The drafter's own record: identity, the readout, the submittal register, "
    + 'what this browser has stored, and the controls that export, import or '
    + 'erase it.',
}

/**
 * §12.11 — the profile sheet. Eight sections, in the order that section lists
 * them, and nothing between them that is not one of the eight.
 *
 * **A server page, and that is load-bearing rather than incidental** — the same
 * shape as `/dashboard/`. It measures the corpus with `curriculumFacts()`,
 * which reaches `node:fs` through the loader, and hands the result down as
 * plain data; the eight leaves below it read the record. §12.2's import rule is
 * that a single value carried across that line pulls `node:fs` into the browser
 * bundle and the build stops, so the boundary is drawn here, at the page, and
 * nowhere lower.
 *
 * **Two routes in this slice already point here, and both would 404 without
 * it**: the header's identity affordance (§12.3, a title block with an empty
 * signed field, deliberately not the reader's own stamp) and `SignOff`'s
 * `NOT SAVED` state, whose adjacent action is `EXPORT YOUR RECORD` (§12.1.4).
 * `EmptyState` classes 2 and 4 also send readers here, for the import and the
 * export respectively.
 *
 * **Every denominator is derived** (§11.25). The readout, the stamp shelf and
 * the register all count from the corpus; nothing on this page is typed by hand,
 * including the numbers a reader would most expect to be.
 *
 * §12.11's closing line is the whole reason the last three sections exist:
 * *control over the artefact is the mechanism of ownership, not decoration on
 * top of it.* Sections 6 and 7 are what make section 8 checkable — a reader can
 * read the bytes, then decide what to do with them.
 */
export default function ProfilePage() {
  const facts = curriculumFacts()

  return (
    <PageShell>
      {/*
        §12.16 — the chord is printed on its own destination, which is what makes
        it discoverable rather than buried in the `?` sheet: every `g` target is
        reachable by a plain focusable link, and the key hint is printed on the
        nav item itself. The header's affordance carries the same hint in its
        `title`; this is the other half of that contract.
      */}
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="hl-listing-title m-0">Profile</h1>
        <p className="hl-mark m-0 text-ink-muted">G P</p>
      </div>

      <p className="hl-lead">
        The drafter's own record: who is checking these sheets, what this
        browser has recorded against them, what it holds that in, and the
        controls that take it out again. Everything on this page is read from
        this browser after the page loads, because a page prerendered once for
        everybody knows nothing about the reader until then.
      </p>

      <hr className="hl-rule-struct" aria-hidden="true" />

      {/* §12.1.2 — the one surface where a quarantined record can be
          discovered. Above everything, because it is the only thing on the page
          that explains why every readout below it is empty. */}
      <QuarantineNote />

      {/* ---- 1 · IDENTITY ------------------------------------------------- */}
      <section className="hl-panel" aria-labelledby="identity">
        <div className="hl-panel-head">
          <h2 id="identity" className="hl-panel-title">
            Identity
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Checked by</p>
        </div>
        <IdentityPanel />
      </section>

      {/* ---- 2 · READOUT -------------------------------------------------- */}
      {/* §7.1 — the full strip. `TRACES` is absent rather than dashed: the
          record's facts carry its denominator but not the graph, so only the
          dashboard can supply the numerator, and a dash standing in for a
          number nobody looked for would be worse than the cell not being there
          (§11.25). */}
      <section className="hl-panel" aria-labelledby="readout">
        <div className="hl-panel-head">
          <h2 id="readout" className="hl-panel-title">
            Readout
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Counted in sheets</p>
        </div>
        <Readout variant="full" facts={facts} />
      </section>

      {/* ---- 3 · UPTIME --------------------------------------------------- */}
      {/* §7.3 / §12.5.5 — fourteen hairline ticks. No flame, no notification,
          and an empty strip is never rendered as a deficit. */}
      <section className="hl-panel" aria-labelledby="uptime">
        <div className="hl-panel-head">
          <h2 id="uptime" className="hl-panel-title">
            Uptime
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Last 14 days</p>
        </div>
        <Uptime />
      </section>

      {/* ---- 4 · STAMP SHELF ---------------------------------------------- */}
      {/* §7.4 — the nine set-level stamps at 168 × 44. Every locked stamp
          states its exact threshold and its live count (§12.5.4), and the three
          the corpus cannot supply today say so in sheets drawn rather than
          going quietly missing (§12.5.6). */}
      <section className="hl-panel" aria-labelledby="stamps">
        <div className="hl-panel-head">
          <h2 id="stamps" className="hl-panel-title">
            Stamps
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Threshold and count, always</p>
        </div>
        <StampShelf facts={facts} />
      </section>

      {/* ---- 5 · SUBMITTAL REGISTER --------------------------------------- */}
      <section className="hl-panel" aria-labelledby="submittals">
        <div className="hl-panel-head">
          <h2 id="submittals" className="hl-panel-title">
            Submittal register
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Checkable by a third party</p>
        </div>
        <SubmittalRegister sheets={facts.sheets} />
      </section>

      {/* ---- 6 · STORAGE -------------------------------------------------- */}
      <section className="hl-panel" aria-labelledby="storage">
        <div className="hl-panel-head">
          <h2 id="storage" className="hl-panel-title">
            Storage
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Queried, not assumed</p>
        </div>
        <StoragePanel />
      </section>

      {/* ---- 7 · THE RAW STORED VALUES ------------------------------------ */}
      <section className="hl-panel" aria-labelledby="raw">
        <div className="hl-panel-head">
          <h2 id="raw" className="hl-panel-title">
            Stored values
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Verbatim</p>
        </div>
        <RawValues />
      </section>

      {/* ---- 8 · DATA ----------------------------------------------------- */}
      <section className="hl-panel" aria-labelledby="data">
        <div className="hl-panel-head">
          <h2 id="data" className="hl-panel-title">
            Data
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Export · import · erase</p>
        </div>
        <DataPanel />
      </section>

      {/* §12.16 — after the eight, because it belongs to the keyboard map
          rather than to the record. It is here because SC 2.1.4 needs the off
          switch to have a home a reader can reach without using a shortcut. */}
      <section className="hl-panel" aria-labelledby="keyboard">
        <div className="hl-panel-head">
          <h2 id="keyboard" className="hl-panel-title">
            Keyboard
          </h2>
          <p className="hl-mark m-0 text-ink-faint">SC 2.1.4</p>
        </div>
        <CharKeysToggle />
      </section>
    </PageShell>
  )
}
