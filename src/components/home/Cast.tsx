import type { CSSProperties } from 'react'
import { art } from '@/components/home/street/art'
import { ART_H, ART_W, CAST, type CastMember } from '@/components/home/street/cast'
import { type ReadingLang, dirOf, langAttr } from '@/lib/content/languages'
import { HOME_COPY } from '@/lib/home-copy'

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
 *
 * **The language is on the words and on nothing round them.** The trade and the story take
 * `lang` and, for Persian, `dir="rtl"`; the name does not, because a name is written as it
 * is written, and the caption's box, the cloud's position and the figure are drawn and
 * never flip (D80). The words come from `lib/home-copy.ts`.
 */

const pct = (n: number) => `${(Math.round(n * 1000) / 10).toFixed(1)}%`

/** The hit box is the body (120 of the drawing's 220 units), so neighbours do not overlap. */
const BODY = 120

/* Where a person stands, as shares of the art box that `home.css` combines with two factors the
   walk sets: `--spread`, how far apart they stand across the facade, and `--grow`, how much larger
   they are drawn (M63). Both are 1 on a page that does not walk. The feet stay where they are. */
function place(m: CastMember): CSSProperties {
  return {
    '--off': pct((m.x - ART_W / 2) / ART_W),
    '--hw': pct(((BODY / 2) * m.s) / ART_W),
    '--w': pct((BODY * m.s) / ART_W),
    '--feet': pct(m.y / ART_H),
    '--h': pct((392 * m.s) / ART_H),
  } as CSSProperties
}

function Words({ m, cloudId, lang }: { m: CastMember; cloudId: string; lang: ReadingLang }) {
  const words = HOME_COPY[lang].cast[m.id]
  const text = { lang: langAttr(lang), dir: dirOf(lang) }
  return (
    <>
      <span className="who-cap">
        <b>{m.name}</b> <span {...text}>{words.trade}</span>
      </span>
      <span className="who-cloud" id={cloudId} aria-hidden="true" {...text}>
        {words.story}
      </span>
    </>
  )
}

export function CastAtGate({ lang }: { lang: ReadingLang }) {
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
          <Words m={m} cloudId={`cloud-${m.id}`} lang={lang} />
        </button>
      ))}
    </div>
  )
}

export function CastRow({ lang }: { lang: ReadingLang }) {
  return (
    <section className="cast-row" aria-label={HOME_COPY[lang].castLabel}>
      <ul>
        {CAST.map((m) => (
          <li key={m.id}>
            <button type="button" className="who-btn who-tile" data-who={m.id} aria-describedby={`tile-cloud-${m.id}`}>
              <span className="who-fig" dangerouslySetInnerHTML={{ __html: art(`cast-${m.id}-tile`) }} />
              <Words m={m} cloudId={`tile-cloud-${m.id}`} lang={lang} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
