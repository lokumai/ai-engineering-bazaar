import Link from 'next/link'
import type { SheetLink } from './DependencyBlock'

/**
 * The modules to read before this one, at the top of the page, by name.
 *
 * The author, 2026-10-12: *"for the requirements, again use a component or
 * mechanism that is intuitive and familiar in best practice"*. They were a
 * `Requirements (n)` disclosure beside the completion button at the END of the
 * page, and opening it showed module NUMBERS — `1, 3` — under three labels
 * (`Requirements`, `Unlocks`, `See also`). A reader decides whether they can
 * start a module before they read it, not after, and a number is a fact about
 * the course's order rather than a name anyone remembers.
 *
 * So it is the box every course platform puts above the lesson: `Before you
 * start`, and the prerequisite modules as titled links. Nothing at all where
 * there are none. A prerequisite nobody has written yet still names itself and
 * says `Planned`, so the reader knows the gap is the course's and not theirs.
 *
 * `Unlocks` and `See also` did not come with it. Where a module leads next is
 * the pager's job at the end of the page, and the rail holds the whole course.
 */
export function Prerequisites({ targets }: { targets: readonly SheetLink[] }) {
  if (targets.length === 0) return null

  return (
    <aside className="bz-prereq" aria-labelledby="bz-prereq-head" lang="en">
      <svg className="bz-prereq-icon" width="18" height="18" viewBox="0 0 16 16" fill="none"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2.75 3.25h3.5a1.75 1.75 0 0 1 1.75 1.75v8a1.25 1.25 0 0 0-1.25-1.25h-4Z" />
        <path d="M13.25 3.25h-3.5A1.75 1.75 0 0 0 8 5v8a1.25 1.25 0 0 1 1.25-1.25h4Z" />
      </svg>
      <div className="bz-prereq-body">
        <p id="bz-prereq-head" className="bz-prereq-title">Before you start</p>
        <ul className="bz-prereq-list">
          {targets.map((target) => (
            <li key={target.module}>
              <Link href={target.path} className="bz-prereq-link" data-draft={target.draft ? '' : undefined}>
                {target.title}
              </Link>
              {target.draft && <span className="bz-prereq-tag">Planned</span>}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
