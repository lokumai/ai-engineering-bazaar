import type { Metadata } from 'next'
import { RECORD_SCOPE } from '@/lib/record/scope'
import { AFFILIATION, LICENCE_LABEL } from '@/lib/site'
import Link from 'next/link'
import { Lkm01 } from '@/components/mascot/Lkm01'
import { PageShell } from '@/components/shell/PageShell'
import { NODE_HEIGHT, NODE_WIDTH } from '@/lib/record/layout'

export const metadata: Metadata = {
  title: 'Legend',
  description:
    'What each line type means, where this browser keeps your record, and '
    + 'what this site deliberately does not have.',
}

/**
 * `SHEET 00 — LEGEND & SPECIMEN` (§12.13).
 *
 * **This replaces onboarding, and it replaces it by not being onboarding.**
 * There is no first-run gate anywhere on this site — no modal, no tour, no
 * coach marks, no name prompt before the index — and this page is never
 * auto-opened. A controlled study of 70 users across 4 apps found that
 * tutorial-viewers rated the same tasks significantly harder (4.92 vs 5.49,
 * p=0.047) with no gain in success or speed; for senior engineers the paradox
 * of the active user makes it worse. So the documented alternative is what
 * ships: in-context documentation, in one fixed place, reachable forever.
 *
 * It is also the **fixed help slot** WCAG 2.2 SC 3.2.6 asks for: the same page,
 * reached the same way, from every route.
 *
 * Four blocks, in this order, because that is the order the questions arrive
 * in: what am I looking at · where is my work kept · what is not here · show me
 * the artefact. The mark and the colophon close it: who drew this, and who
 * publishes it. Both are provenance, and provenance belongs at the end of a
 * sheet rather than in front of the reader's first question.
 *
 * **A server page, and hook-free on purpose.** Every mark below is drawn in a
 * fixed state — this is a key, not a readout — so there is nothing here for
 * channel B to fill in and nothing to hydrate (§12.2). The marks are the real
 * ones: `.hl-signoff-square`, `.hl-gauge-tick` and `.hl-node` with the same
 * `data-*` attributes the index rows, the tick gauges and the dashboard write,
 * so `record.css` draws the legend from the same rules it draws the site from.
 * A hand-drawn picture of the marks would be a fourth place for them to be
 * defined, and it would start disagreeing the first time a token moved.
 */

/** The four states `Diagram` gives a node. Local: it is a CSS contract, not data. */
type NodeSampleState = 'draft' | 'unread' | 'started' | 'signed'

/**
 * One dashboard node, at the size the dashboard draws it (44 × 26), with 2px of
 * clearance so the 2px accent left edge is not clipped by the viewport.
 *
 * `aria-hidden`, and that is §10.4 rather than laziness: the row's own `<dd>`
 * states what the mark means in words, so the drawing is the illustration and
 * the text is the carrier. A `role="img"` here would announce the same sentence
 * twice.
 */
function NodeSample({ state }: { state: NodeSampleState }) {
  const width = NODE_WIDTH + 4
  const height = NODE_HEIGHT + 4

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <g className="hl-node" data-state={state}>
        <rect x={2} y={2} width={NODE_WIDTH} height={NODE_HEIGHT} />
        {state === 'signed' && (
          <line className="hl-node-edge" x1={2} y1={2} x2={2} y2={2 + NODE_HEIGHT} />
        )}
        <text
          x={2 + NODE_WIDTH / 2}
          y={2 + NODE_HEIGHT / 2}
          textAnchor="middle"
          dominantBaseline="central"
        >
          00
        </text>
      </g>
    </svg>
  )
}

/**
 * One row of the key: the state named, every mark that carries it, and what it
 * means.
 *
 * A plain grid rather than `.hl-defs`, which uppercases its whole content — the
 * right treatment for a machine-derived value and the wrong one for a sentence.
 * The term is the same wording the dashboard's own table prints for that state,
 * so a reader who has met one has met the other.
 *
 * **The term and the marks share the `<dt>`.** The marks are `aria-hidden`, so a
 * `<dt>` holding only marks would be an empty term and a screen reader would
 * read a list of nothings against a list of definitions. Together they are what
 * a legend row actually is: this state, drawn these ways, meaning this.
 */
function KeyRow({
  term,
  marks,
  children,
}: {
  term: string
  marks: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <>
      <dt className="flex items-center gap-2">
        <span className="hl-mark text-ink">{term}</span>
        {marks}
      </dt>
      <dd className="m-0 font-display text-meta leading-normal text-ink-muted">
        {children}
      </dd>
    </>
  )
}

/** §12.19 — deferred to a following slice. Absent today, and named as absent. */
const DEFERRED: readonly string[] = [
  'The command palette and full-text search',
  'Notes',
  'Bookmarks',
  'Spaced review',
  'Turkish routes',
  'Choice-type quiz questions',
]

/**
 * §12.19 — not coming, because there is nobody here to do them.
 *
 * This list USED TO INCLUDE `Accounts` and `Cross-device sync`, under the
 * heading "Impossible without a backend", justified by "this site is a static
 * export: there is no server". §14 built both. Sheet 00 was then telling a
 * reader that two shipped features could never exist — the §1 failure this page
 * exists to prevent, printed on the page that explains the rule.
 *
 * What survives the correction is what a backend does not supply: an instructor
 * to grade, a peer asked to judge, an authority to issue a credential. None of
 * those is a row in a table; each is a party, and this system has none of them.
 */
const NO_SECOND_PARTY: readonly string[] = [
  'Instructor grading',
  'Peer assessment',
  'A verifiable credential',
]

/**
 * §12.4 — refused rather than missing, and the distinction is the point.
 *
 * These are all buildable now. They are not built because this site reports on
 * the reader and compares them to nobody, and an aggregate figure is the first
 * step to doing otherwise. Listing them beside the ones nobody can do would
 * hide a decision behind an impossibility.
 */
const REFUSED: readonly string[] = [
  'Any cohort or aggregate figure — no “most readers finish in a week”, no ranking against anybody',
  'Leaderboards',
  'Discussion',
  'Social sharing',
]

export default function LegendPage() {
  return (
    <PageShell sheet="SHEET 00">
      <p className="hl-eyebrow hl-mark">SHEET 00 — LEGEND &amp; SPECIMEN</p>

      <h1 className="hl-listing-title">Legend</h1>

      <p className="hl-lead">
        This site is drawn as a set of engineering sheets, and it reports only
        what it can observe. This page is the key to the marks it draws with, the
        disclosure of where your record is kept, and the list of what it does not
        have. Nothing here opens by itself, and nothing here is a step in a
        sequence.
      </p>

      <hr className="hl-rule-struct" aria-hidden="true" />

      {/* ---- 1 · the line-type key (§12.10.4, §12.13) --------------------- */}
      <section className="hl-panel" aria-labelledby="hl-legend-lines">
        <div className="hl-panel-head">
          <h2 id="hl-legend-lines" className="hl-panel-title">
            Line types
          </h2>
          <p className="hl-mark m-0 text-ink-faint">ISO 128</p>
        </div>

        <p className="mt-0 mb-4 max-w-[var(--width-prose)] font-display text-meta leading-normal text-ink-muted">
          Line type carries every state first and the accent repeats it second.
          That is why the drawing still reads in print, in a forced-colours
          theme, and for a reader who sees no colour at all: remove the accent
          and the dashes, the weights and the words are all still there.
        </p>

        {/* Two columns above 640px and stacked below it: the marks and their
            names are the widest thing here, and squeezing the meaning into
            what is left on a phone would set it four words to the line. */}
        <dl className="m-0 grid max-w-[var(--width-wide)] items-start gap-y-3 sm:grid-cols-[minmax(0,224px)_minmax(0,1fr)] sm:gap-x-5">
          <KeyRow
            term="Not drawn"
            marks={
              <>
                <span className="hl-signoff-square" data-drawn="false" aria-hidden="true" />
                <NodeSample state="draft" />
              </>
            }
          >
            A hidden line, dashed 3 2. The sheet is in the set and its geometry
            is not: it has no sign-off control at all, and it awards nothing.
          </KeyRow>

          <KeyRow
            term="Not signed off"
            marks={
              <>
                <span className="hl-signoff-square" data-signed="false" aria-hidden="true" />
                <NodeSample state="unread" />
              </>
            }
          >
            A solid hairline. Every drawn sheet is in this state until you say
            otherwise.
          </KeyRow>

          <KeyRow term="In progress" marks={<NodeSample state="started" />}>
            Something is recorded against the sheet — an answer written, an item
            ticked, a source opened — and it is still not signed off.
          </KeyRow>

          <KeyRow
            term="Signed off"
            marks={
              <>
                <span className="hl-signoff-square" data-signed="true" aria-hidden="true" />
                <NodeSample state="signed" />
              </>
            }
          >
            The accent outline, the accent wash, and the 2px left edge an
            approved node carries everywhere on the site. You asserted it;
            nothing here inferred it, and you can un-sign it at any time.
          </KeyRow>

          <KeyRow
            term="Tick gauge"
            marks={
              <span className="hl-gauge" aria-hidden="true">
                <span className="hl-gauge-tick" data-state="approved" />
                <span className="hl-gauge-tick" />
                <span className="hl-gauge-tick" data-state="undrawn" />
              </span>
            }
          >
            One tick per sheet in the subsystem: accent signed off, solid drawn,
            dashed hairline not yet drawn. Never a percentage, because counting
            in sheets is what lets what is done and what is left both be stated
            truthfully.
          </KeyRow>
        </dl>

        <p className="mt-4 mb-0 max-w-[var(--width-prose)] font-display text-meta leading-normal text-ink-muted">
          On the dashboard a solid trace above a band is a prerequisite, a dashed
          trace below it is a cross-reference, and a trace goes accent when both
          of the sheets it joins are signed off. The hairline chain between nodes
          is sheet order, which is not a dependency.
        </p>
      </section>

      {/* ---- 2 · the storage disclosure (§12.1.7) ------------------------- */}
      <section className="hl-panel" aria-labelledby="hl-legend-storage">
        <div className="hl-panel-head">
          <h2 id="hl-legend-storage" className="hl-panel-title">
            Where your record is
          </h2>
          <p className="hl-mark m-0 text-ink-faint">This browser only</p>
        </div>

        {/*
          §12.1.7 — three flat lines: mechanism, risk, mitigation. A note block,
          not a banner: no dismiss, no icon, no caution colour. Escalating a
          routine architectural fact to alarm styling both overstates it and
          spends the alarm budget the erase dialog needs (§12.15).

          Word for word the same three lines the name field carries on the
          profile sheet. They are stated twice because §12.1.7 places them in
          both slots, and the wording is identical so that a reader who has read
          one has read the other.
        */}
        <div className="hl-note">
          <p>{RECORD_SCOPE}</p>
          <p>
            Browser storage can be cleared without warning — by you, by the
            browser, or by a private window. Safari deletes it after seven days
            without a visit.
          </p>
          <p>Export your record to a file to keep it.</p>
        </div>

        {/*
          §1 — this paragraph used to open "There is no account and no server to
          hold anything, so there is nothing to sign in to and nothing to delete
          on request." True in Phase 3, false the moment §14 landed, and missed
          when `scope.ts` fixed the other four copies of the same claim: the
          panel above it had already been corrected, so Sheet 00 was
          contradicting itself two paragraphs apart.

          It states the whole shape unconditionally rather than switching on
          §14.1's flag, for `scope.ts`'s reason: copy that changes with the
          session means the signed-out reader learns one rule and never meets
          the one that replaced it.

          It POINTS at the erase dialog rather than restating what erasing
          removes. That promise has one home (§14.6), and a second copy here is
          how the first one came to be wrong.
        */}
        <p className="mt-4 mb-0 max-w-[var(--width-prose)] font-display text-meta leading-normal text-ink-muted">
          The record is one key in this browser&rsquo;s local storage, it is
          readable in a text editor, and the profile sheet prints it verbatim.
          Signed out, that key is the whole of it. With an account there is a
          second copy, held under your account, and the erase dialog on the
          profile sheet states what each half removes and what an organisation
          keeps.
        </p>

        <div className="hl-signoff-actions mt-4">
          <Link className="hl-btn" href="/profile/">
            OPEN THE PROFILE SHEET
          </Link>
          <Link className="hl-btn" href="/report/">
            BUILD A RECORD OF WORK
          </Link>
        </div>
      </section>

      {/* ---- 3 · what is not here (§12.19, §12.0) ------------------------- */}
      <section className="hl-panel" aria-labelledby="hl-legend-absent">
        <div className="hl-panel-head">
          <h2 id="hl-legend-absent" className="hl-panel-title">
            What this site does not have
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Named, not stubbed</p>
        </div>

        <p className="mt-0 mb-4 max-w-[var(--width-prose)] font-display text-meta leading-normal text-ink-muted">
          Naming an absence is honest. A control that looks like a feature and
          does nothing is not, so nothing below is present as a disabled button
          or a greyed-out menu item. It is not built.
        </p>

        <h3 className="hl-mark m-0 mb-2 text-ink">Deferred to a following slice</h3>
        <ul className="m-0 mb-6 max-w-[var(--width-prose)] list-none p-0 font-display text-meta leading-normal text-ink-muted">
          {DEFERRED.map((item) => (
            <li key={item} className="mb-1">
              {item}
            </li>
          ))}
        </ul>

        <h3 className="hl-mark m-0 mb-2 text-ink">
          Nobody here can do these, and therefore not coming
        </h3>
        <ul className="m-0 mb-6 max-w-[var(--width-prose)] list-none p-0 font-display text-meta leading-normal text-ink-muted">
          {NO_SECOND_PARTY.map((item) => (
            <li key={item} className="mb-1">
              {item}
            </li>
          ))}
        </ul>

        <h3 className="hl-mark m-0 mb-2 text-ink">Refused, not missing</h3>
        <ul className="m-0 mb-4 max-w-[var(--width-prose)] list-none p-0 font-display text-meta leading-normal text-ink-muted">
          {REFUSED.map((item) => (
            <li key={item} className="mb-1">
              {item}
            </li>
          ))}
        </ul>

        <p className="mt-0 mb-4 max-w-[var(--width-prose)] font-display text-meta leading-normal text-ink-muted">
          The first three need a party this system does not have: no instructor
          exists in it, no peer is asked to judge anybody, and there is no
          issuing key to sign a credential with. Built here anyway, each would
          be a page stating something it cannot know. The second list is a
          decision instead of a limit &mdash; this site reports on you and ranks
          you against nobody, so the figures that would make a ranking possible
          are not collected.
        </p>

        {/*
          Stated because the two lists above no longer state it, and a reader
          who read this page before §14 shipped was told the opposite.
        */}
        <p className="m-0 max-w-[var(--width-prose)] font-display text-meta leading-normal text-ink-muted">
          Accounts and cross-device sync are not on either list: they exist.
          Signing in is optional and gates nothing &mdash; every sheet, every
          quick check and every sign-off behaves the same signed out &mdash; and
          what an account changes is stated in <em>Where your record is</em>
          {' '}above. An organisation can also assign sheets with due dates,
          which is the nearest thing here to enrolment; it recommends an order
          and gates nothing either.
        </p>
      </section>

      {/* ---- 4 · the specimen (§12.13) ------------------------------------ */}
      <section className="hl-panel" aria-labelledby="hl-legend-specimen">
        <div className="hl-panel-head">
          <h2 id="hl-legend-specimen" className="hl-panel-title">
            Specimen record
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Sample data</p>
        </div>

        <p className="mt-0 mb-4 max-w-[var(--width-prose)] font-display text-meta leading-normal text-ink-muted">
          The document this site can produce is a single self-contained HTML
          file. The specimen is one of those, generated at build time from
          labelled sample data and stamped as a specimen, so you can read the
          real artefact — the ledger, the evidence register, the seven limits,
          the audit instructions — before you have signed anything off.
        </p>

        <div className="hl-signoff-actions">
          <Link className="hl-btn" href="/legend/specimen/">
            OPEN THE SPECIMEN
          </Link>
        </div>
      </section>

      {/* §8.5 — the about sheet is one of the places the mark appears, and the
          two sentences below are the whole prose personality budget for the
          site, spent here, once. It sits in the panel body rather than beside a
          heading, and it never speaks. */}
      <section className="hl-panel" aria-labelledby="hl-legend-mark">
        <div className="hl-panel-head">
          <h2 id="hl-legend-mark" className="hl-panel-title">
            Drawn by
          </h2>
          <p className="hl-mark m-0 text-ink-faint">LKM-01</p>
        </div>

        <div className="flex items-center gap-4">
          <Lkm01 size={96} idPrefix="legend" />
          <p className="m-0 max-w-[var(--width-prose)] font-display text-meta leading-normal text-ink-muted">
            LKM-01 (Lokum) is a 1-unit cube. It has drawn every figure in this
            curriculum.
          </p>
        </div>
      </section>

      {/* ---- 6 · the colophon --------------------------------------------- */}
      {/*
        Who publishes this, and what that organisation belongs to.

        A colophon and not a marketing block, and the distinction is the whole
        design: the footer names these three on every page, so a reader who
        wants the relationship has somewhere to look it up — once, at the end of
        the sheet that already answers "what am I looking at". Nothing here
        praises anybody, because §12.14.1's register scans this route and
        because a curriculum that spends its credibility on a slogan has less of
        it left for the sheets.

        The rows are `AFFILIATION`, in order. The order is the claim (§4), which
        is why neither this file nor the footer keeps a list of its own.
      */}
      <section className="hl-panel" aria-labelledby="hl-legend-colophon">
        <div className="hl-panel-head">
          <h2 id="hl-legend-colophon" className="hl-panel-title">
            Colophon
          </h2>
          <p className="hl-mark m-0 text-ink-faint">Who publishes this</p>
        </div>

        <dl className="m-0 max-w-[var(--width-prose)]">
          {AFFILIATION.map((affiliate) => (
            <div
              key={affiliate.name}
              className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-b-0"
            >
              <dt className="hl-mark flex-none text-ink-muted">{affiliate.role}</dt>
              <dd className="m-0 font-display text-meta text-ink">
                <a className="hl-link" href={affiliate.url}>
                  {affiliate.name}
                </a>
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 mb-0 max-w-[var(--width-prose)] font-display text-meta leading-normal text-ink-muted">
          The chain reads outward. LokumAI publishes this site and is part of
          Intellica; Intellica is a PIA Group company. The curriculum itself is
          open source under the {LICENCE_LABEL}, and the sheets carry no
          endorsement from any of the three.
        </p>
      </section>
    </PageShell>
  )
}
