import { ClaimReceipt } from '@/components/record/ClaimReceipt'
import { Readout } from '@/components/record/Readout'
import { categoryLabels } from '@/lib/content/chrome'
import { curriculumFacts } from '@/lib/content/facts'
import { Breadcrumb } from './Breadcrumb'
import { type Revision, SiteFooter } from './SiteFooter'

/**
 * The frame every route sits in — M16 stage 1 part 2.
 *
 * Reference: `playground/01-theme-T4-ground-G3-powder.html`. The bar and the
 * band are `SiteHeader`'s; this is everything under them: the three-column
 * grid, the reading column, the trail, and the footer.
 *
 * ## Three columns belong to one route, and that is the mockup's own answer
 *
 * Only two mockups have a fixed leading track — `01` at
 * `262px minmax(0,1fr) 204px` and `04` at `250px minmax(0,1fr) 196px`. The
 * catalog, the dashboard and the home page are drawn single-column inside the
 * bar. So `bz-shell` appears when a route passes a `rail`, which today is the
 * module page alone, and every other route is a bare `bz-main`. What "every
 * route carries the shell" means is the bar and the band, which every route
 * does carry.
 *
 * **The grid has to be a full-width child of `<body>`**, because the rail and
 * the aside anchor to the window rather than to a centred container. That is
 * the difference D15 recorded and the reason `bleed` used to exist.
 *
 * ## What M16 removed from this file
 *
 * **`bleed` is gone.** It existed to opt one route out of a 1152px
 * `max-w-[var(--width-shell)]` box, and there is no such box any more: the
 * middle column's padding is fluid and `bz-col` caps the measure. A prop whose
 * only job was to say "not that cap" has nothing left to say.
 *
 * **`RegistrationMarks` is gone**, deleted rather than hidden. Four L-shaped
 * corner marks are a second decorative element, and DESIGN.md's Don't is
 * exactly "add a second decorative element anywhere". The ornament budget is
 * spent once, on the band.
 *
 * ## The trail lives here now
 *
 * The retired header gave the breadcrumb a second 32px row of its own; the
 * mockup puts `nav.crumb` inside the reading column, above the display
 * heading. So this renders it, which also means every route gets one without
 * asking — and it is why `Breadcrumb` is a client leaf held by a server
 * component that can measure the corpus for it.
 *
 * The footer stays here for the reason it always did: §5.2's first row prints
 * this page's own sheet number and revision, and a layout has no page data in
 * scope. A page that forgets the shell loses its `<main>` as well as its
 * footer, which `accessibility.spec.ts` fails loudly on.
 */
export function PageShell({
  children,
  sheet,
  revision,
  rail,
  aside,
  column = true,
  trail = true,
  trailLabel,
}: {
  children: React.ReactNode
  /** §5.2 — `MODULE 13 OF 33`. Omitted, the footer names the route instead. */
  sheet?: string | null
  /** §5.2, §11.26 — this file's last-touching commit, never repo HEAD. */
  revision?: Revision | null
  /**
   * The leading column. Passing one turns the page into the three-column
   * grid; omitting it leaves the reading column the whole window.
   */
  rail?: React.ReactNode
  /** The trailing column: an in-page index. Only meaningful beside a `rail`. */
  aside?: React.ReactNode
  /**
   * Cap the children at the reading measure. True for prose, false for a
   * surface the mockups draw edge to edge — the catalog's three views, the
   * home page's level grid, the progress page's two-up panels.
   */
  column?: boolean
  /** The breadcrumb. Off only where a trail would name a page nobody navigated to. */
  trail?: boolean
  /**
   * What the trail's last crumb says, for the one route whose address names
   * nothing. See `Breadcrumb`'s own note: the not-found page hands this over
   * rather than letting the router infer it.
   */
  trailLabel?: string
}) {
  const facts = curriculumFacts()

  const inner = (
    <>
      {/*
        §17.6 — news about the reader's record, above the page's own content
        because it is not part of whatever page they happened to land on.

        BOTH OF THESE FOLLOW THE PAGE'S OWN COLUMN, and that is a fix rather
        than a tidy-up. They used to take `bz-col` unconditionally, on the
        reasoning that a sentence of prose measured against 1440px is
        unreadable whatever is around it — which is true of the sentence and
        false of the page. `bz-col` does two things, and the second one is the
        problem: it caps the measure AND centres it (`margin-inline: auto`).
        On a route that is deliberately wider than the measure — the catalog,
        the two level listings, the home page — that put the trail in an 814px
        box centred at x=313 while the page's own heading started at x=49.
        MEASURED on `/`, `/courses/`, `/courses/expert/` and `/sheets/`: the
        same 264px misalignment on every one of them, which is the first thing
        a reader's eye lands on under the bar.

        A trail names where THIS page is, so it belongs at this page's left
        edge. The reading page is unchanged, because there the page is the
        column and the two already agreed.
      */}
      {column ? (
        <div className="bz-col">
          <ClaimReceipt />
        </div>
      ) : (
        <ClaimReceipt />
      )}
      {trail && (column ? (
        <div className="bz-col">
          <Breadcrumb categories={categoryLabels()} current={trailLabel} />
        </div>
      ) : (
        <Breadcrumb categories={categoryLabels()} current={trailLabel} />
      ))}
      {column ? <div className="bz-col">{children}</div> : children}
    </>
  )

  /*
   * §10.2 — the skip link's target. `tabIndex={-1}` so the fragment can
   * actually take focus: without it Safari and VoiceOver leave the cursor in
   * the header after the skip.
   */
  const main = (
    <main id="main" tabIndex={-1} className="bz-main">
      {inner}
    </main>
  )

  return (
    <>
      {rail === undefined ? main : (
        <div className="bz-shell" data-bz-aside={aside === undefined ? undefined : ''}>
          <aside className="bz-rail">
            <div className="bz-rail-inner">{rail}</div>
          </aside>
          {main}
          {aside === undefined ? null : <aside className="bz-aside">{aside}</aside>}
        </div>
      )}

      <SiteFooter
        sheet={sheet}
        revision={revision}
        readout={<Readout variant="compact" facts={facts} />}
      />
    </>
  )
}
