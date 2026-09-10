import type { Metadata } from 'next'
import type { FaceLegendRow, FaceLegendRows } from '@/components/mascot/FaceLegend'
import { OrgMembershipPanel } from '@/components/auth/AuthPanels'
import { SessionProvider } from '@/components/auth/SessionProvider'
import { PathStanding } from '@/components/path/PathStanding'
import { PathSteps, type SheetRef, type SheetRefs } from '@/components/path/PathSteps'
import { AttentionPanel, type AttentionSheet } from '@/components/record/AttentionPanel'
import { CourseCompletion, type CompletionLevel } from '@/components/record/CourseCompletion'
import { DataPanel } from '@/components/record/DataPanel'
import { Diagram, DiagramReadout, TracesReading } from '@/components/record/Diagram'
import { DrafterBlock } from '@/components/record/DrafterBlock'
import { FoldFragment } from '@/components/record/FoldFragment'
import {
  CharKeysReading,
  CharKeysToggle,
  ClaimPanel,
  ClaimReading,
  DATA_READING,
  OrgReading,
  QuarantineNote,
  RawValues,
  ReadoutReading,
  RoleReading,
  StampsReading,
  StoragePanel,
  StorageReading,
  StoredValuesReading,
  SubmittalReading,
  SubmittalRegister,
  SubsystemLegend,
  UptimeReading,
} from '@/components/record/ProfilePanels'
import { Readout } from '@/components/record/Readout'
import { Register, RegisterRow, type RegisterRowProps } from '@/components/record/Register'
import { ReportPanel } from '@/components/record/ReportPanel'
import { RolePanel } from '@/components/record/RolePanel'
import { StampShelf } from '@/components/record/StampShelf'
import { Uptime } from '@/components/record/Uptime'
import { PageShell } from '@/components/shell/PageShell'
import type { CategorySlug } from '@/lib/content/categories'
import { CATEGORIES } from '@/lib/content/curriculum-file'
import { moduleGraph } from '@/lib/content/edges'
import { curriculumFacts, type CurriculumFacts } from '@/lib/content/facts'
import { sheetRows } from '@/lib/content/manifest'
import { reportFacts } from '@/lib/content/report-facts'
import { PATHS } from '@/lib/path/paths'
import { SHORTCUTS } from '@/lib/record/keys'
import { ROLES } from '@/lib/path/roles'
import { SITE_ORIGIN } from '@/lib/site-origin'
import { plural } from '@/lib/text'

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
    'One page for your own record: what is waiting on you, every module and '
    + 'whether you have completed it, your path, the record of work you can '
    + 'build from it, and the controls that export, import or erase it.',
}

/**
 * M14 — ONE progress-and-account route, where there were four.
 *
 * ## What this replaces
 *
 * `/profile/`, `/dashboard/`, `/report/` and `/path/` all answered the same
 * reader question — *how far am I, and what is on record about me* — and each
 * answered a different part of it, so a reader had to know which of four
 * addresses held the part they wanted. The author's judgement on two of them
 * was that they were unusable. They are one page now, and the other three
 * redirect: `src/app/dashboard/page.tsx`, `src/app/report/page.tsx` and
 * `src/app/path/page.tsx` are `MovedTo` stubs, which is what a redirect has to
 * be in a static export.
 *
 * **`/profile/` is the survivor and the choice was not arbitrary.** Only one of
 * the four could keep its address, and this one owns every deep link on the
 * site: `#data`, `#claim`, `#raw`, `#storage` and `#hl-account-head` are
 * pointed at from `SignOff`'s NOT SAVED state, from `EmptyState`'s classes 2
 * and 4, from the claim receipt and from the header's identity affordance. A
 * fragment cannot survive a `<meta refresh>`, so redirecting this route would
 * have broken five in-tree affordances to save renaming a URL that no reader
 * reads. `logs/BRAINSTORM.md` D24 records it.
 *
 * ## The shape: two open blocks, then a register
 *
 * §16 measured what was wrong with this page before: 1,260 words, eleven `<h2>`
 * panels and twenty form controls in `<main>` before a single island mounted,
 * with the two controls a reader comes for about 700 words apart. Its answer
 * was the register — one line per subject, folded, each line printing the
 * reading its panel exists to report (§16.4.1) — and folding three more routes
 * into the page is only possible because that answer holds. So the four things a
 * reader arrives wanting are open:
 *
 *   1. who they are and what account, if any (`DrafterBlock`)
 *   2. what is waiting on them, and why (`AttentionPanel`, §15.7)
 *   3. every module, with completion visible and adjustable (control C, D14)
 *
 * and everything else is one folded line each. The three rows that arrived with
 * the fold are the path's ordered steps (inside the row that already states the
 * role), the curriculum diagram, and the record-of-work builder.
 *
 * ## What is measured here rather than lower down
 *
 * **A server page, and that is load-bearing.** `curriculumFacts()`,
 * `moduleGraph()`, `sheetRows()` and `reportFacts()` all reach `node:fs`
 * through the loader; §12.2's import rule is that a single value carried across
 * that line pulls `node:fs` into the browser bundle and stops the build. So
 * every measurement is taken up here and handed down as plain data, and the
 * islands below read only the record.
 *
 * `reportFacts` needs an absolute origin because the criteria URL it builds is
 * printed inside a file that will be opened from `file://` on somebody else's
 * machine, where a site-relative path resolves against their filesystem. There
 * is no request-time server to ask, so the origin is derived from the repository
 * (`lib/site-origin.ts`).
 *
 * **Every denominator is derived** (§11.25). The readout, the stamp shelf, the
 * register's own counts, the face legend, control C's three numbers and the
 * path's standing all count from the corpus; nothing on this page is typed by
 * hand, including the numbers a reader would most expect to be.
 *
 * §12.11's closing line is still why the last four rows exist: *control over the
 * artefact is the mechanism of ownership, not decoration on top of it.* Storage
 * and Stored values are what make Export/import/erase checkable — a reader can
 * read the bytes, then decide what to do with them.
 */

/**
 * §13.2 — the face legend's rows, measured here because this is the side of
 * §12.2's boundary that may read the corpus.
 *
 * **The denominator is READY modules in the level, not every module in it.**
 * `FaceLegendRow.total` is documented as the modules a reader could complete,
 * and a planned module carries no completion control at all (§12.4.1) — so a
 * level that is entirely planned has a total of 0, which the legend prints as
 * `PLANNED` rather than as `0/9` beside a face nobody can fill (§11.25).
 *
 * `signed` is `null` for every row: a numerator is reader state, it travels on
 * channel B, and the build knows nothing about the reader. `SubsystemLegend`
 * writes the counts in after its store has answered.
 */
function faceLegendRows(facts: CurriculumFacts): FaceLegendRows {
  const drawn = new Map<string, number>()
  for (const sheet of facts.sheets) {
    if (!sheet.drawn) continue
    drawn.set(sheet.category, (drawn.get(sheet.category) ?? 0) + 1)
  }

  // Keyed off CATEGORIES, which is the closed set `CategorySlug` is written
  // from, so the map is total by construction and the legend cannot lose a face
  // to a typo. Partial until the loop ends, because there is no way to name the
  // categories at once without hand-listing them here as well.
  const rows: Partial<Record<CategorySlug, FaceLegendRow>> = {}
  for (const category of CATEGORIES) {
    rows[category.slug] = {
      title: category.title,
      total: drawn.get(category.slug) ?? 0,
      signed: null,
    }
  }
  return rows as FaceLegendRows
}

/**
 * §15.7 — the build-time half of the attention list, moved here with the panel.
 *
 * The panel is handed every module rather than the ready ones alone.
 * `selectAttention` iterates the RECORD, and a record can legitimately hold an
 * entry for a module that has since become a draft (an import, a renamed file):
 * the honest row for that module names it and says `PLANNED`, which it cannot
 * do if the page withheld the title (§12.1.3).
 */
function attentionSheets(facts: CurriculumFacts): readonly AttentionSheet[] {
  const titles = new Map(CATEGORIES.map((category) => [category.slug as string, category.title]))
  return facts.sheets
    .slice()
    .sort((a, b) => a.module - b.module)
    .map((sheet) => ({
      slug: sheet.slug,
      module: sheet.module,
      title: sheet.title,
      subsystem: titles.get(sheet.category) ?? sheet.category,
      drawn: sheet.drawn,
    }))
}

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

/**
 * §16.4 — the register's rows, in order, with the id each one keeps.
 *
 * **Exported because the order is part of the specification and a test has to be
 * able to read it** (hazard H-P). The unit suite is `renderToStaticMarkup` with
 * no DOM, no Testing Library and no clicking, so the only things it can assert
 * are markup and constants; a hand-typed list of ids in a test file is a second
 * author of this table and would drift from it silently. The rendering below
 * maps over exactly this array, so what ships and what the test reads are the
 * same array in the same order.
 *
 * **Every id from the eleven rows §16.4 shipped is verbatim.** Roughly twenty
 * assertions across the four suites address these as
 * `section[aria-labelledby="storage"|"raw"|"data"|"submittals"]`, and
 * `hl-orgs-head` is `OrgMembershipPanel`'s heading id. Renaming one is not a
 * rename; it is a broken anchor and twenty broken assertions.
 *
 * **M14 appends two and never reorders.** `diagram` is the curriculum diagram
 * `/dashboard/` used to hold and `report` is the record of work `/report/` used
 * to be; both sit after the rows about the reader and before the rows about the
 * bytes, which is where a reader looking for "something I can show somebody"
 * would look. The path's ordered steps did NOT get a row of their own: they
 * belong to the row that already states the role, and a second row would have
 * been two rows for one subject.
 */
export const REGISTER_ROWS = [
  { id: 'readout', name: 'Readout' },
  { id: 'uptime', name: 'Streak' },
  { id: 'stamps', name: 'Stamps' },
  { id: 'submittals', name: 'What you built' },
  { id: 'role', name: 'Role and path' },
  { id: 'diagram', name: 'The curriculum as one diagram' },
  { id: 'report', name: 'Record of work' },
  { id: 'hl-orgs-head', name: 'Organisation' },
  { id: 'claim', name: 'Last claim' },
  { id: 'storage', name: 'Storage' },
  { id: 'raw', name: 'Stored values' },
  { id: 'data', name: 'Export, import, erase' },
  { id: 'keyboard', name: 'Keyboard' },
] as const satisfies ReadonlyArray<Pick<RegisterRowProps, 'id' | 'name'>>

/**
 * §16.4.2's escape hatch again: the record-of-work row has no selector to read.
 *
 * There is no count of "how much record of work" a reader has — the file is
 * built on demand out of everything the record holds — so the row prints its
 * subject rather than inventing a number, exactly as the export/import/erase
 * row does with `DATA_READING`. The words are §12.12's own for it.
 */
const REPORT_READING = 'ONE FILE, BUILT IN THIS BROWSER'

/** The register's own heading id (§16.7: the register carries an `h2`). */
const REGISTER_HEADING_ID = 'register'

/** Which row needs a session, so exactly one row is wrapped in a provider. */
type RegisterRowId = (typeof REGISTER_ROWS)[number]['id']

export default function ProgressPage() {
  const facts = curriculumFacts()
  const edges = moduleGraph().edges
  const rows = sheetRows()
  const legend = faceLegendRows(facts)
  // §13.4.2's denominator. `RolePanel` and `RolePicker` are client islands and
  // `status: ready` lives in the markdown, so the measurement is taken here.
  const drawnSlugs = facts.sheets.filter((sheet) => sheet.drawn).map((sheet) => sheet.slug)
  const sheets = sheetRefs()

  /**
   * Control C's input: every level in curriculum order, with every module in
   * it — planned or not, because the denominator is the level and not the part
   * of it somebody has written (§11.25). The same shape the home page hands it,
   * from the same measurement, because they are one control on two surfaces
   * (D14).
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

  /**
   * The reading and the body for each row in `REGISTER_ROWS`, keyed by its id.
   *
   * A record keyed by the id union rather than thirteen inline `<RegisterRow>`
   * blocks, for one reason: the type makes a row that is in the table and not
   * rendered — or rendered and not in the table — a compile error rather than a
   * page that quietly lost a panel. `needsSession` is on the row rather than in
   * the markup because exactly one row's reading reads the session, and a
   * provider around the whole register would put four of them on this document.
   */
  const panels: Record<
    RegisterRowId,
    { reading: React.ReactNode; body: React.ReactNode; needsSession?: true }
  > = {
    /* §7.1 — the full strip. `TRACES` is filled by the diagram row, which is
       the only place on the site that counts it; here the strip carries what
       the record's own facts can supply. §13.2's face legend sits under it,
       because the faces and the strip count the same modules. */
    readout: {
      reading: <ReadoutReading facts={facts} />,
      body: (
        <>
          <Readout variant="full" facts={facts} />
          <SubsystemLegend facts={facts} legend={legend} />
        </>
      ),
    },

    /* §7.3 / §12.5.5 — fourteen hairline ticks. No flame, no notification, and
       an empty strip is never rendered as a deficit. */
    uptime: { reading: <UptimeReading />, body: <Uptime /> },

    /* §7.4 — the set-level stamps at 168 × 44. Every locked stamp states its
       exact threshold and its live count (§12.5.4), and the ones the corpus
       cannot supply today say so in modules ready rather than going quietly
       missing (§12.5.6). */
    stamps: { reading: <StampsReading facts={facts} />, body: <StampShelf facts={facts} /> },

    /* §12.11 item 5 — the only content in the record a third party can check. */
    submittals: {
      reading: <SubmittalReading sheets={facts.sheets} />,
      body: <SubmittalRegister sheets={facts.sheets} />,
    },

    /* §13.3, §13.4.3 — a role is a statement the reader makes, never a guess
       this site makes, and changing it touches no completion.

       **M14 folded `/path/` in here.** All nine ordered paths are in this
       markup and channel A shows exactly one: `lokum.css` resolves
       `.hl-path-body[data-role="<id>"]` against the `hl-role-<id>` class the
       boot script stamps before first paint (§12.2), and `.hl-path-empty`
       against the absence of all nine. That is what makes the row correct in
       frame one for a reader with a role and for one without — and it is why
       nothing here is gated behind React state. The rejected alternative was
       nine routes, which a static export would prerender once for every
       reader: eight pages describing somebody else's route. */
    role: {
      reading: <RoleReading />,
      body: (
        <>
          {/* `RolePanel` is both states already: with no role it prints §12.13's
              fifth empty state and the picker; with one it prints the standing,
              the drafts and the picker behind `Another role`. So there is
              exactly ONE `RolePicker` on this document — two would be two radio
              groups sharing the name `hl-role`, which is one group as far as
              the browser is concerned and a reader choosing in one would clear
              the other. */}
          <RolePanel drawnSlugs={drawnSlugs} />

          {/* All nine ordered paths, and channel A shows exactly one: a reader
              with no role gets none of them, which is the honest state and not
              a placeholder — a drawn route for a role nobody chose is a page
              claiming something that is not true of them (§1). */}
          {ROLES.map((role) => {
            const path = PATHS.find((candidate) => candidate.role === role.id)
            if (path === undefined) return null

            return (
              <div key={role.id} className="hl-path-body" data-role={role.id} data-hl-path={role.id}>
                <p className="hl-panel-note text-start">
                  {role.label} · {plural(path.steps.length, 'step')} in order
                </p>
                {/* §13.8 — the standing, above the steps it describes, and the
                    island that marks the ONE step to take next. It is the only
                    statement of the standing on this row: M14 took the two
                    overlapping rows out of `RolePanel`'s list rather than
                    printing one derivation twice. Channel B, so it prints `--`
                    until the store answers, and the marker is set from an
                    effect scoped to this role's own body — an unscoped
                    selector would mark a step in the eight paths this reader
                    is not on. */}
                <PathStanding role={role.id} drawnSlugs={drawnSlugs} />
                <PathSteps path={path} sheets={sheets} />
              </div>
            )
          })}
        </>
      ),
    },

    /* §4.10 / §12.10 — the whole curriculum as one single-line diagram: every
       module, every prerequisite, and every cross-reference between modules in
       one level. It held `/dashboard/` together and it is the one surface that
       can count `TRACES`, because the record's facts carry the denominator and
       not the graph (§5.8, §7.1). */
    diagram: {
      // §16.4.1/§16.4.2 — the reading is the one number only this row can
      // count, taken from the same `useTraces` the strip in its body uses: the
      // edges with BOTH endpoints completed (§5.8). A reading that stated the
      // corpus's own two counts instead would have been the same line for a
      // reader who has completed nothing and a reader who has completed
      // everything, which is what `record-pages.spec.ts` fails a counted
      // reading for.
      reading: <TracesReading facts={facts} edges={edges} />,
      body: (
        <>
          <DiagramReadout facts={facts} edges={edges} />
          <Diagram facts={facts} edges={edges} />
        </>
      ),
    },

    /* §12.12 — the `RECORD OF WORK`: one self-contained HTML file, built in
       this browser out of what this browser has recorded, and saved to the
       reader's own disk. Nobody assessed it and no authority issued it, and the
       file says so in its second block, above everything else it states
       (§12.12.4). */
    report: {
      reading: REPORT_READING,
      body: <ReportPanel facts={reportFacts(SITE_ORIGIN)} counts={facts} />,
    },

    /* §14.5 — read only in this revision, and the row says which account's
       memberships it is reporting. The provider is here rather than around the
       register because this is the only row that reads a session. */
    'hl-orgs-head': {
      reading: <OrgReading />,
      body: <OrgMembershipPanel chrome="inline" />,
      needsSession: true,
    },

    /* §17.7 — what this browser and the account last exchanged. Beside the
       organisation row because both are facts about the account meeting this
       browser; the receipt is local by construction (§17.1), so it reports this
       browser's history and never another device's. */
    claim: { reading: <ClaimReading />, body: <ClaimPanel /> },

    /* §12.1.6 — queried, never assumed, and bytes are never a percentage. */
    storage: { reading: <StorageReading />, body: <StoragePanel /> },

    /* §12.11 item 7 — the bytes themselves, which is the cheapest proof §1
       reaches the storage layer. */
    raw: { reading: <StoredValuesReading />, body: <RawValues /> },

    /* §12.15 — the row with no selector: there is no count of how exportable a
       record is, so it prints its subject (§16.4.2). */
    data: { reading: DATA_READING, body: <DataPanel /> },

    /* §12.16 — SC 2.1.4 needs the off switch to have a home a reader can reach
       without using a shortcut. */
    keyboard: { reading: <CharKeysReading />, body: <CharKeysToggle /> },
  }

  return (
    <PageShell column={false}>
      {/*
        §12.16 — the chord is printed on its own destination, which is what makes
        it discoverable rather than buried in the `?` sheet: every `g` target is
        reachable by a plain focusable link, and the key hint is printed on the
        nav item itself. The header's affordance carries the same hint in its
        `title`; this is the other half of that contract.
      */}
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="bz-display m-0">Your progress</h1>
        {/* Derived, not typed: `SHORTCUTS` is where this chord is defined and
            where the handler reads it from, so a page that spelled it out
            would keep printing a chord that no longer works. */}
        <p className="hl-mark m-0 text-on-surface-muted">{PROFILE_CHORD}</p>
      </div>

      <p className="bz-lead">
        Everything this browser has recorded about your reading, on one page:
        what is waiting on you, every module and whether you have completed it,
        the path you chose, and the controls that take a copy out or erase it.
        All of it is read from this browser after the page loads, because a page
        prerendered once for everybody knows nothing about the reader until then.
      </p>

      <hr className="bz-rule" aria-hidden="true" />

      {/* §12.1.2 — the one surface where a quarantined record can be
          discovered. Above everything, because it is the only thing on the page
          that explains why every readout below it is empty. */}
      <QuarantineNote />

      {/* §16.1 — the block that arrives open: who is checking these modules,
          and the account, if there is one. */}
      <DrafterBlock />

      {/* §15.7 — above every meter, because a reader arriving mid-course met
          four renderings of how far along they are before anything told them
          what to do next. Every row prints why it is there, and the reason is
          `attention.ts`'s own: this page adds no rule, no threshold and no
          second definition of "stalled". */}
      <section className="hl-panel" aria-labelledby="waiting">
        <div className="hl-panel-head">
          <h2 id="waiting" className="hl-panel-title">
            Waiting on you
          </h2>
          <p className="hl-panel-note">Opened, not completed</p>
        </div>
        <AttentionPanel sheets={attentionSheets(facts)} />
      </section>

      {/* D14 — completion control C, the same control the home page carries:
          the whole course, visible and adjustable, without opening anything. */}
      <div className="hl-panel-head">
        <h2 id="progress-levels" className="hl-panel-title">
          Every module
        </h2>
        <p className="hl-panel-note">Yours to set, and to take back</p>
      </div>
      <CourseCompletion facts={facts} levels={levels} headingId="progress-levels" />

      {/* §17.6 — `/profile/#claim` and `/profile/#data` are affordances two
          other surfaces offer, and both ids sit inside a closed `<summary>`.
          One island for the whole page opens the fold the fragment names; it
          renders nothing, here or in the prerender. */}
      <FoldFragment />

      {/* §16.4 — and everything else, one line each. */}
      <div className="hl-panel-head">
        <h2 id={REGISTER_HEADING_ID} className="hl-panel-title">
          What else is on record
        </h2>
        <p className="hl-panel-note">Closed, and each row states its reading</p>
      </div>

      <Register labelledBy={REGISTER_HEADING_ID}>
        {REGISTER_ROWS.map(({ id, name }) => {
          const panel = panels[id]
          const rendered = (
            <RegisterRow key={id} id={id} name={name} reading={panel.reading}>
              {panel.body}
            </RegisterRow>
          )
          // `SessionProvider` renders context and no element, so the register's
          // grid still sees the row itself as its child.
          return panel.needsSession === true ? (
            <SessionProvider key={id}>{rendered}</SessionProvider>
          ) : (
            rendered
          )
        })}
      </Register>
    </PageShell>
  )
}
