import type { CSSProperties } from 'react'
import { art } from '@/components/home/street/art'
import { ART_H, ART_W, CAST, type CastMember } from '@/components/home/street/cast'

/**
 * The people at the gate (M58): seven buttons, each a figure with its caption under it and
 * its story in a cloud above it.
 *
 * Two renderings, and CSS shows one: `CastAtGate` stands them on the pavement in the gate
 * art's own units, from 900px up (where the walk, the still picture and the page with no
 * script all place them), and `CastRow` lines them up in two rows under the gate below
 * 900px (P1, M50), where nobody turns or runs. The hidden one is `display: none`, so a
 * screen reader meets one set of seven.
 *
 * **The words are on the button, not on the art.** The figure is decoration
 * (`aria-hidden`); the button is named by its caption, and the story is its description
 * (`aria-describedby`), so a screen reader gets both without opening anything. The cloud
 * that shows the story is the same element, kept out of the name with `aria-hidden` (a
 * description reads a hidden element it points at directly). With no script, pointing or
 * focus opens the cloud in CSS; `street/clouds.ts` adds the tap, Escape, one cloud at a
 * time, and keeping a cloud inside the window.
 */

const pct = (n: number) => `${(Math.round(n * 1000) / 10).toFixed(1)}%`

/** The hit box is the body (120 of the drawing's 220 units), so neighbours do not overlap. */
const BODY = 120

/* Across, a person stands at their distance from the middle of the gate times `--spread`:
   1 on a page that does not walk, and wider on the walk, where the facade runs far past the
   art's box (`motion.ts` sets it), so neighbours' captions never meet. */
function place(m: CastMember): CSSProperties {
  return {
    '--cx': pct(0.5 - ((BODY / 2) * m.s) / ART_W),
    '--off': pct((m.x - ART_W / 2) / ART_W),
    top: pct((m.y - 392 * m.s) / ART_H),
    width: pct((BODY * m.s) / ART_W),
    height: pct((392 * m.s) / ART_H),
  } as CSSProperties
}

function Words({ m, cloudId }: { m: CastMember; cloudId: string }) {
  return (
    <>
      <span className="who-cap">
        <b>{m.name}</b> <span>{m.trade}</span>
      </span>
      <span className="who-cloud" id={cloudId} aria-hidden="true">
        {m.story}
      </span>
    </>
  )
}

export function CastAtGate() {
  return (
    <div className="cast-box" data-cast>
      {CAST.map((m) => (
        <button
          key={m.id}
          type="button"
          className="who-btn"
          data-who={m.id}
          aria-describedby={`cloud-${m.id}`}
          style={place(m)}
        >
          <span className="who-fig" dangerouslySetInnerHTML={{ __html: art(`cast-${m.id}`) }} />
          <Words m={m} cloudId={`cloud-${m.id}`} />
        </button>
      ))}
    </div>
  )
}

export function CastRow() {
  return (
    <section className="cast-row" aria-label="The people at the gate">
      <ul>
        {CAST.map((m) => (
          <li key={m.id}>
            <button type="button" className="who-btn who-tile" data-who={m.id} aria-describedby={`tile-cloud-${m.id}`}>
              <span className="who-fig" dangerouslySetInnerHTML={{ __html: art(`cast-${m.id}-tile`) }} />
              <Words m={m} cloudId={`tile-cloud-${m.id}`} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
