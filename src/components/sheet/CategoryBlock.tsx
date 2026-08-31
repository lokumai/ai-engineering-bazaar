import Link from 'next/link'
import { plural } from '@/lib/text'
import { TickGauge, type TickState } from './TickGauge'

/**
 * §5.4 — the category block: `SUBSYSTEM 0n`, the subsystem's name, and the
 * discrete tick gauge, stacked in a 176px column. No border, no ground, no
 * card. §5.4 says it twice and §11.2 says it again: there is no category card
 * in this system, and there is no module card either.
 *
 * Two of §5.4's states are reachable today and one is not. A subsystem with
 * nothing drawn takes a muted name and an all-dashed gauge — four of the six
 * are in that state, and saying so plainly is the point. "All sheets
 * approved" is a fact about a reader; it waits for the progress store, and
 * until then nothing here paints a tick accent (T1).
 */

export interface CategoryBlockProps {
  order: number
  title: string
  path: string
  /** One tick per sheet in the subsystem, in sheet order. */
  ticks: readonly TickState[]
}

export function CategoryBlock({ order, title, path, ticks }: CategoryBlockProps) {
  const drawn = ticks.filter((tick) => tick !== 'not-drawn').length

  return (
    <Link
      href={path}
      className="hl-category"
      data-undrawn={drawn === 0 ? '' : undefined}
    >
      <span className="hl-mark hl-category-order">
        Subsystem {String(order).padStart(2, '0')}
      </span>
      <span className="hl-category-name">{title}</span>
      <span className="hl-category-gauge">
        <TickGauge
          ticks={ticks}
          label={`${plural(ticks.length, 'sheet')}, ${drawn} drawn`}
        />
      </span>
    </Link>
  )
}
