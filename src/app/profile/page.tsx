import type { Metadata } from 'next'
import type { FaceLegendRow, FaceLegendRows } from '@/components/mascot/FaceLegend'
import { OrgMembershipPanel } from '@/components/auth/AuthPanels'
import { SessionProvider } from '@/components/auth/SessionProvider'
import { DataPanel } from '@/components/record/DataPanel'
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
import { RolePanel } from '@/components/record/RolePanel'
import { StampShelf } from '@/components/record/StampShelf'
import { Uptime } from '@/components/record/Uptime'
import { PageShell } from '@/components/shell/PageShell'
import { CATEGORIES, type CategorySlug } from '@/lib/content/categories'
import { curriculumFacts, type CurriculumFacts } from '@/lib/content/facts'

export const metadata: Metadata = {
  title: 'Profile',
  description:
    "The drafter's own record: identity, the readout, the submittal register, "
    + 'what this browser has stored, and the controls that export, import or '
    + 'erase it.',
}

/**
 * §13.2 — the face legend's six rows, measured here because this is the side of
 * §12.2's boundary that may read the corpus.
 *
 * **The denominator is DRAWN sheets in the category, not every sheet in it.**
 * `FaceLegendRow.total` is documented as the sheets a reader could sign off, and
 * a draft sheet carries no sign-off control at all (§12.4.1) — so a category
 * that is entirely drafts has a total of 0, which the legend prints as
 * `NOT DRAWN` rather than as `0/9` beside a face nobody can fill (§11.25).
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
  // to a typo. Partial until the loop ends, because there is no way to name six
  // keys at once without hand-listing them here as well.
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
 * §16.4 — the register's rows, in order, with the id each one keeps.
 *
 * **Exported because the order is part of the specification and a test has to be
 * able to read it** (hazard H-P). The unit suite is `renderToStaticMarkup` with
 * no DOM, no Testing Library and no clicking, so the only things it can assert
 * are markup and constants; a hand-typed list of eleven ids in a test file is a
 * second author of this table and would drift from it silently. The rendering
 * below maps over exactly this array, so what ships and what the test reads are
 * the same array in the same order — the two id-sequence assertions that pinned
 * the old eleven panels have something to pin again.
 *
 * **Every id is verbatim from the panel it replaces.** Roughly twenty
 * assertions across the four suites address these as
 * `section[aria-labelledby="storage"|"raw"|"data"|"submittals"]`, and
 * `hl-orgs-head` is `OrgMembershipPanel`'s heading id, which `AuthShell` stops
 * emitting in `inline` chrome precisely so that this table can own it. Renaming
 * one is not a rename; it is a broken anchor and twenty broken assertions.
 *
 * `role` was an `h3` inside the old identity panel rather than a panel id of its
 * own (§13.3 puts `role` in `RecordData.identity`, so it was one subject with
 * the name and the mark). It keeps the id at the level the register gives every
 * row.
 */
export const REGISTER_ROWS = [
  { id: 'readout', name: 'Readout' },
  { id: 'uptime', name: 'Uptime' },
  { id: 'stamps', name: 'Stamps' },
  { id: 'submittals', name: 'Submittal register' },
  { id: 'role', name: 'Role and path' },
  { id: 'hl-orgs-head', name: 'Organisation' },
  { id: 'claim', name: 'Last claim' },
  { id: 'storage', name: 'Storage' },
  { id: 'raw', name: 'Stored values' },
  { id: 'data', name: 'Export, import, erase' },
  { id: 'keyboard', name: 'Keyboard' },
] as const satisfies ReadonlyArray<Pick<RegisterRowProps, 'id' | 'name'>>

/** The register's own heading id (§16.7: the register carries an `h2`). */
const REGISTER_HEADING_ID = 'register'

/** Which row needs a session, so exactly one row is wrapped in a provider. */
type RegisterRowId = (typeof REGISTER_ROWS)[number]['id']

/**
 * §12.11, rewritten by §16 — the profile sheet: one open drafter block, and one
 * register of eleven closed rows.
 *
 * **A server page, and that is load-bearing rather than incidental** — the same
 * shape as `/dashboard/`. It measures the corpus with `curriculumFacts()`,
 * which reaches `node:fs` through the loader, and hands the result down as
 * plain data; the leaves below it read the record. §12.2's import rule is that a
 * single value carried across that line pulls `node:fs` into the browser bundle
 * and the build stops, so the boundary is drawn here, at the page, and nowhere
 * lower.
 *
 * **Why the page is two blocks instead of eleven panels.** §16.0 opened on a
 * reading complaint and then measured it: 1260 words in `<main>`, eleven `<h2>`
 * panels and twenty form controls before a single React island mounted, with the
 * two controls a reader comes here for about 700 words apart. Every panel was
 * the single implementation of something, so nothing is deleted for being
 * redundant — it is folded. The drafter block is what a reader came to use; the
 * register is what the record holds, one line each, stating its reading.
 *
 * **§16.4.1 is the rule that makes folding honest.** A closed row prints the
 * number the panel exists to report, so folding removes prose and never a fact —
 * §10.4's contract on the silent indicator, applied to a disclosure.
 * `RegisterRow` refuses a blank reading at render time rather than shipping an
 * empty column, and every reading below comes from the selector its own body
 * already uses (§16.4.2, §11.25, §14.9). Readings that are reader state print
 * `--` in the prerendered HTML, which is the house spelling for "no reading
 * taken yet" and is correct rather than a gap.
 *
 * **What §16.5 deleted from this file.** The five-row definition list, which
 * described alias, mark, seed, account and organisation without printing any of
 * the five values — the mark and the seed are now two mono lines under the
 * drawing, and the account and the organisation are read in their own places.
 * And the three anchor buttons under it (`Change alias`, `Change mark`,
 * `Account and sign-out`), all three of which scrolled to a control on the same
 * page; the controls are in the box now, so the links have nowhere left to go.
 *
 * **Two routes in this slice point here, and both would 404 without it**: the
 * header's identity affordance (§12.3) and `SignOff`'s `NOT SAVED` state, whose
 * adjacent action is `EXPORT YOUR RECORD` (§12.1.4). `EmptyState` classes 2 and
 * 4 also send readers here, for the import and the export respectively — both
 * inside the `data` row.
 *
 * **Every denominator is derived** (§11.25). The readout, the stamp shelf, the
 * register's own counts and the face legend all count from the corpus; nothing
 * on this page is typed by hand, including the numbers a reader would most
 * expect to be.
 *
 * §12.11's closing line is still why the last three rows exist: *control over
 * the artefact is the mechanism of ownership, not decoration on top of it.*
 * Storage and Stored values are what make Export/import/erase checkable — a
 * reader can read the bytes, then decide what to do with them.
 */
export default function ProfilePage() {
  const facts = curriculumFacts()
  const legend = faceLegendRows(facts)

  /**
   * The reading and the body for each row in `REGISTER_ROWS`, keyed by its id.
   *
   * A record keyed by the id union rather than eleven inline `<RegisterRow>`
   * blocks, for one reason: the type makes a row that is in the table and not
   * rendered — or rendered and not in the table — a compile error rather than a
   * page that quietly lost a panel. `needsSession` is on the row rather than in
   * the markup because exactly one row's reading reads the session, and a
   * provider around the whole register would put four of them on this document.
   */
  const rows: Record<
    RegisterRowId,
    { reading: React.ReactNode; body: React.ReactNode; needsSession?: true }
  > = {
    /* §7.1 — the full strip. `TRACES` is absent rather than dashed: the
       record's facts carry its denominator but not the graph, so only the
       dashboard can supply the numerator, and a dash standing in for a number
       nobody looked for would be worse than the cell not being there (§11.25).
       §13.2's face legend sits under it, because the six faces and the strip
       count the same sheets. */
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
       exact threshold and its live count (§12.5.4), and the three the corpus
       cannot supply today say so in sheets drawn rather than going quietly
       missing (§12.5.6). */
    stamps: { reading: <StampsReading facts={facts} />, body: <StampShelf facts={facts} /> },

    /* §12.11 item 5 — the only content in the record a third party can check. */
    submittals: {
      reading: <SubmittalReading sheets={facts.sheets} />,
      body: <SubmittalRegister sheets={facts.sheets} />,
    },

    /* §13.3 — a role is a statement the reader makes, never a guess this site
       makes, and changing it touches no sign-off. */
    role: { reading: <RoleReading />, body: <RolePanel /> },

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
        The drafter's own record: who is checking these sheets, and what this
        browser has recorded against them. Everything here is read from this
        browser after the page loads, because a page prerendered once for
        everybody knows nothing about the reader until then.
      </p>

      <hr className="hl-rule-struct" aria-hidden="true" />

      {/* §12.1.2 — the one surface where a quarantined record can be
          discovered. Above everything, because it is the only thing on the page
          that explains why every readout below it is empty. */}
      <QuarantineNote />

      {/* §16.1 — the one block that arrives open. */}
      <DrafterBlock />

      {/* §17.6 — `/profile/#claim` and `/profile/#data` are affordances two
          other surfaces offer, and both ids sit inside a closed `<summary>`.
          One island for the whole page opens the fold the fragment names; it
          renders nothing, here or in the prerender. */}
      <FoldFragment />

      {/* §16.4 — and everything else, one line each. */}
      <div className="hl-panel-head">
        <h2 id={REGISTER_HEADING_ID} className="hl-panel-title">
          The register
        </h2>
        <p className="hl-mark m-0 text-ink-faint">Closed, and each row states its reading</p>
      </div>

      <Register labelledBy={REGISTER_HEADING_ID}>
        {REGISTER_ROWS.map(({ id, name }) => {
          const row = rows[id]
          const rendered = (
            <RegisterRow key={id} id={id} name={name} reading={row.reading}>
              {row.body}
            </RegisterRow>
          )
          // `SessionProvider` renders context and no element, so the register's
          // grid still sees the row itself as its child.
          return row.needsSession === true ? (
            <SessionProvider key={id}>{rendered}</SessionProvider>
          ) : (
            rendered
          )
        })}
      </Register>
    </PageShell>
  )
}
