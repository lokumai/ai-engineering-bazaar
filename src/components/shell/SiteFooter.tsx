import Link from 'next/link'
import { Fragment } from 'react'
import { ABOUT_ROUTE } from '@/lib/route-labels'
import {
  AFFILIATION,
  LEGAL_ROUTE,
  LICENCE_LABEL,
  LICENCE_URL,
  PRIVACY_ROUTE,
  REPO_URL,
  SITE_OWNER,
} from '@/lib/site'

/**
 * Site footer (spec §5.2). A provenance row of 32px under one hairline top rule, and since M94
 * the site owner's row, which is as tall as its text needs.
 *
 * M111, D134 — there was a first row above these, 40px: the page's sheet label (`HOME`, `MODULE 13
 * OF 33`), the file's revision, and a compact readout of the reader's record (`Completed 07/33 ·
 * Reading time 3 h 10 m`). The author called it useless and it was removed end to end, not hidden.
 * The footer therefore takes no props and holds no reader state: it is the same server-rendered
 * markup on every route. The reading record lives on `/profile/`.
 */
export function SiteFooter() {
  return (
    <footer role="contentinfo" className="border-t border-line-strong bg-surface" lang="en">
      <div className="w-full px-[22px]">
        {/* Row 1 — provenance. The repository, the licence, the hand that
            drew it, and the organisations behind it: six cells that are all the
            same KIND of fact, which is why they share one rule rather than
            earning a third row.

            `min-h-8` and `flex-wrap`, where the row used to be a fixed `h-8`.
            Six cells do not fit across 342px, and §4.7 allows exactly one
            answer to that: the row takes a second line. A fixed height would
            have clipped the wrapped line instead, and a `nowrap` row would have
            pushed the document sideways — the one thing no page may do. On any
            width where the six fit, `min-h-8` is 32px. */}
        <div className="flex min-h-8 flex-wrap items-center gap-x-3 text-meta text-on-surface-muted">
          {/* M90, D115 — why the Bazaar exists. In the footer and not the bar: the phone bar is full
              (`MainNav.tsx`, `data-bar-edge`), and a page about the project is the footer's kind of
              link, next to the repository and the licence. */}
          <Link className="bz-link" href={ABOUT_ROUTE}>
            About
          </Link>
          <Dot />
          <a className="bz-link" href={REPO_URL}>
            Repository
          </a>
          <Dot />
          <a className="bz-link" href={LICENCE_URL}>
            {LICENCE_LABEL}
          </a>
          <Dot />
          <span>Marked by LKM-01</span>
          <Dot />
          {/* M18 — `/legend/` was reachable from `/team/` and from nowhere else,
              and `/team/` is itself only reachable from `/team/assignments/`.
              That was survivable while the page only explained the marks; it
              stopped being survivable the moment M18 moved the KEYBOARD MAP
              there, because the bar's `?` button went in the same commit and
              the only discovery path left was pressing a key you would have to
              already know about.

              The page's own docblock calls itself *"the fixed help slot WCAG
              2.2 SC 3.2.6 asks for: the same page, reached the same way, from
              every route"* — which the footer is what makes true, since the
              footer is on every route. It was a claim about a link nobody had
              drawn. */}
          <Link className="bz-link" href="/legend/">
            Legend and keys
          </Link>
          {/* The chain, in `AFFILIATION` order. Names only: the relationship
              between them is stated once, with its labels, in `/legend/`'s
              colophon. A footer is the wrong place to explain a corporate
              structure and the right place to name one. */}
          {AFFILIATION.map((affiliate) => (
            <Fragment key={affiliate.name}>
              <Dot />
              <a className="bz-link" href={affiliate.url}>
                {affiliate.name}
              </a>
            </Fragment>
          ))}
        </div>

        {/* M94, D118 — row 3, who owns the site and how to reach them. Law 5651 asks a content
            provider to be identifiable on the site itself, and the footer is the one place every
            route carries. The facts are `SITE_OWNER`'s, written once with their sources; the
            registered name is printed whole because a shortened name is not the registered one.
            An `<address>` because it is contact information for the page's owner, and `not-italic`
            because the element's default is an emphasis nothing here means.

            Two groups, the owner on the left and the way to reach them on the right, so that a
            narrow width wraps BETWEEN the groups and never leaves a separator dot at the end of a
            line. A 73-character name and an address do not fit across 342px, so the row takes
            more lines rather than pushing the document sideways (§4.7); `py-2` and not a fixed
            height, for the same reason. The details live on `/legend/`: the footer
            names, the page explains. */}
        <address className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2 text-meta not-italic text-on-surface-muted">
          <div className="flex flex-col">
            <span>{SITE_OWNER.tradeName}</span>
            <span>{SITE_OWNER.address}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3">
            <a className="bz-link" href={`mailto:${SITE_OWNER.email}`}>
              {SITE_OWNER.email}
            </a>
            <Dot />
            <Link className="bz-link" href={PRIVACY_ROUTE}>
              Privacy
            </Link>
            <Dot />
            <Link className="bz-link" href={LEGAL_ROUTE}>
              Legal
            </Link>
          </div>
        </address>
      </div>
    </footer>
  )
}

/**
 * The separator between two footer cells.
 *
 * `aria-hidden`, because a screen reader announcing "middle dot" between every
 * pair reads the punctuation of a layout as content. It was already written
 * three times in this row before the affiliation cells arrived and would have
 * been written six; one component is the same mark in every gap.
 */
function Dot() {
  return (
    <span aria-hidden="true" className="text-on-surface-faint">
      ·
    </span>
  )
}
