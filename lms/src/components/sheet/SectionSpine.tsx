'use client'

import { useEffect, useState } from 'react'
import type { TocEntry } from '@/lib/content/render'
import { TableOfContents } from './TableOfContents'

/**
 * §4.6 part 1 / §5.6 — the scroll tracker behind the section spine.
 *
 * §5.6 fixes the mechanism: **one** `IntersectionObserver` with
 * `rootMargin: "-80px 0px -60% 0px"`, and the last-intersecting heading wins.
 * No scroll listener and no `requestAnimationFrame` loop — both run on every
 * frame of every scroll to answer a question that changes a handful of times
 * per page. The 80px top inset is the sticky header plus the clearance the
 * rails keep from it; the 60% bottom inset stops a heading at the foot of the
 * viewport from claiming the spine before the reader has reached it.
 *
 * That band is about 40% of the viewport tall and this corpus's sections are
 * far taller, so for most of a read *no* heading is inside it. The observer
 * therefore answers "which heading is in the band", and when the answer is
 * "none" — on load, after an anchor jump, or halfway down a long section — the
 * band's lower edge is measured directly and the last heading above it wins.
 *
 * One addition to §5.6's mechanism, and it is deliberate. An
 * `IntersectionObserver` reports only *changes* of state, so a scroll longer
 * than the band — an anchor click, `End`, `PageDown`, the browser restoring a
 * position on reload — can move several headings from "below the band" to
 * "above the band" without any of them ever being inside it, and fire no
 * callback at all. The spine would then sit on a section the reader left
 * thousands of pixels ago, which is precisely the kind of quiet lie §1 is
 * about. `scrollend` fires once when a scroll gesture finishes and closes that
 * hole. It is not the per-frame polling §5.6 rules out — that is the same
 * sentence's `requestAnimationFrame` loop — and where the event is
 * unsupported the observer alone still tracks a continuous read correctly.
 *
 * With JavaScript off the spine lists every section and links to it; only the
 * highlight is missing, and §10.4 forbids that highlight from being the sole
 * carrier of anything.
 */
export function SectionSpine({ entries }: { entries: readonly TocEntry[] }) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (entries.length === 0) return

    const headings = entries
      .map((entry) => document.getElementById(entry.id))
      .filter((el): el is HTMLElement => el !== null)
    if (headings.length === 0) return

    /** The last heading whose first line has passed the band's lower edge. */
    const passed = (): string | null => {
      const edge = window.innerHeight * 0.4
      let found: string | null = null
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= edge) found = heading.id
      }
      return found
    }

    const visible = new Set<string>()

    /**
     * The heading in the band, in document order — "the last intersecting
     * heading wins" — and, when the band holds none, the last one the reader
     * has scrolled past.
     */
    const settle = () => {
      const last = entries.filter((entry) => visible.has(entry.id)).at(-1)
      setActiveId(last ? last.id : passed())
    }

    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (record.isIntersecting) visible.add(record.target.id)
          else visible.delete(record.target.id)
        }
        settle()
      },
      { rootMargin: '-80px 0px -60% 0px' },
    )

    for (const heading of headings) observer.observe(heading)
    settle()
    window.addEventListener('scrollend', settle, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener('scrollend', settle)
    }
  }, [entries])

  return <TableOfContents entries={entries} activeId={activeId} />
}
