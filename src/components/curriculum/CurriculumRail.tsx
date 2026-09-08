import Link from 'next/link'
import type { RailLevel } from '@/lib/content/rail'
import { RailFoldButton } from './RailFold'

/**
 * M10 — the curriculum as an accordion, and the left rail of a module page.
 *
 * This is the answer to two of the thirteen flaws
 * (`kia-context/logs/BRAINSTORM.md` D10). The author's words for the first:
 * *"when we are in a specific level, its tab in the left sidebar must imply it
 * by maybe becoming a bit larger and distinguishing or by changing its color or
 * border or anything similar."* And for the second: *"the green tick on each
 * completed module in the left sidebar entry should be bolder and larger.
 * currently it is too small."*
 *
 * ## Why the left rail holds the curriculum and not the contents
 *
 * It used to hold the contents of the module and the right rail held the
 * module's metadata. That is backwards for the way a reader moves: the thing
 * you reach for most often on a course page is *another page of the course*,
 * and it belongs on the side a reader's eye starts from. The contents of the
 * page you are already on is a within-page aid, so it goes right. The swap is
 * the reason M10's remainder and M11 are one piece of work — see
 * `kia-context/logs/PROGRESS.md`.
 *
 * ## No JavaScript, and that is a correctness point
 *
 * Five `<details>` disclosures, one per level, with the current level's `open`
 * set at build time. The same argument `MainNav` makes: the export is static,
 * a reader can click a link in the first frame, and a menu that needs
 * `useState` to open does nothing until the bundle lands. The browser supplies
 * Enter, Space and the expanded state; nothing here claims `aria-expanded` by
 * hand.
 *
 * The one part that does need the browser is the fold, and it is a separate
 * leaf (`RailFold.tsx`) so this component can stay a server component and read
 * the corpus.
 *
 * ## The tick, and why it is drawn the way it is
 *
 * Channel A (§12.2). The boot script stamps `hl-signed-<n>` on `<html>` before
 * first paint and `lokum-modules.css` reveals the mark for that module, so a
 * reader's completed modules are already ticked in frame one with no React and
 * no hydration. That is also why the mark is `display: none` by default rather
 * than a state prop: the build has never met this reader and must not claim
 * one way or the other (§12.2).
 *
 * The mark is a **filled disc with a white check**, 17px, and the shape is
 * load-bearing rather than decorative: teal on the ground measures 3.44:1 to
 * 3.90:1 depending on the ground, so as a text glyph it would fail the 4.5:1
 * floor and as a graphical indicator it clears the 3:1 one comfortably. It
 * carries the word `Complete` for a screen reader inside it, revealed by the
 * same rule, so completion is never carried by colour alone. See
 * `kia-context/specs/DESIGN.md`, Colors.
 *
 * A draft module has no mark and no selector that could reveal one: it has no
 * completion control either (§12.4.1), and a rule that could light up would
 * state that it could be completed.
 */

function Chevron() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
      className="hl-level-chevron"
    >
      <path d="M2.5 4.5L6 8l3.5-3.5" />
    </svg>
  )
}

function Tick() {
  return (
    <span className="hl-mod-mark">
      <svg
        viewBox="0 0 17 17"
        width="11"
        height="11"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="hl-mod-check"
      >
        <path d="M3.5 9l3 3 7-7" />
      </svg>
      {/* Not `aria-hidden`: this is the part that says what the disc means, and
          it is revealed by the same rule, so the two cannot disagree. */}
      <span className="sr-only">Complete</span>
    </span>
  )
}

export function CurriculumRail({
  levels,
  currentSlug,
  currentLevel,
}: {
  levels: readonly RailLevel[]
  /** The module being read, or null on a page that is not one. */
  currentSlug: string | null
  /** The level being read. Its section opens and is enlarged. */
  currentLevel: string | null
}) {
  return (
    /* Not named `Curriculum`: the trail under the navbar already owns that
       landmark name (`Breadcrumb.tsx`), and two navigation landmarks with one
       name is a locator a reader's software has to disambiguate for them. */
    <nav aria-label="Course modules" className="hl-rail-nav">
      <div className="hl-rail-head">
        <span className="hl-rail-title">Course modules</span>
        <RailFoldButton />
      </div>

      <div className="hl-rail-scroll">
        {levels.map((level) => {
          const current = level.slug === currentLevel
          return (
            <details
              key={level.slug}
              className="hl-level"
              data-cat={level.slug}
              data-current={current ? '' : undefined}
              open={current}
            >
              <summary className="hl-level-head">
                {/* The level's own colour, and its number and name beside it:
                    the hue is never the only carrier (§13.1.4). */}
                <span aria-hidden="true" className="hl-level-key" />
                <span className="hl-level-order">
                  {String(level.order).padStart(2, '0')}
                </span>
                <span className="hl-level-title">{level.title}</span>
                <span className="hl-level-count">{level.modules.length}</span>
                <Chevron />
              </summary>

              <ul role="list" className="hl-level-modules">
                {level.modules.map((module) => (
                  <li key={module.slug}>
                    <Link
                      href={module.path}
                      className="hl-mod"
                      data-module={module.module}
                      data-draft={module.drawn ? undefined : ''}
                      aria-current={module.slug === currentSlug ? 'page' : undefined}
                    >
                      {/* Reserved whether or not it is ever revealed, so a
                          completion does not shift the row it lands on. */}
                      <span className="hl-mod-lead">
                        {module.drawn && <Tick />}
                      </span>
                      <span className="hl-mod-order">
                        {String(module.module).padStart(2, '0')}
                      </span>
                      <span className="hl-mod-title">{module.title}</span>
                      {!module.drawn && (
                        <span className="hl-mod-tag">Planned</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )
        })}
      </div>
    </nav>
  )
}
