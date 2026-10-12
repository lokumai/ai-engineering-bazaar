import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import { Fraunces } from 'next/font/google'
import Link from 'next/link'
import { BazaarStreetMotion } from '@/components/home/BazaarStreetMotion'
import { art, type ArtName } from '@/components/home/street/art'
import { PageShell } from '@/components/shell/PageShell'
import { CATEGORIES } from '@/lib/content/curriculum-file'
import { INDEX_ROUTE, levelRoute } from '@/lib/route-labels'
import { SITE_NAME } from '@/lib/site'

/**
 * §15.2.2 — one document, so one title, and it claims nothing about the reader.
 *
 * `title.absolute`, because the root layout's template would print the site's
 * name twice. The description says what the place is and states no number.
 */
export const metadata: Metadata = {
  title: { absolute: SITE_NAME },
  description:
    'The front door: what this course is, why it is written the way it is, and '
    + 'the way in to every level.',
}

/**
 * The display face of the front door, and of nothing else (D79).
 *
 * M16 took downloaded fonts off the site: the mockup names a system stack, so
 * type follows the reader's OS. The author's chosen home page sets its headline
 * and its signs in Fraunces, and the concept is the reference for this page, so
 * the face comes back HERE ONLY: `next/font` fetches it at build time and serves
 * it from the site, so a reader's browser makes no request to Google. Every
 * other page keeps the system stack.
 */
const display = Fraunces({ subsets: ['latin'], axes: ['SOFT', 'opsz'], display: 'swap' })

/**
 * The four stalls: the author's mottos, in the author's words (2026-10-12).
 *
 * Written rather than counted, and on purpose: these are what the course
 * promises, not facts about the corpus, so there is nothing to derive them from.
 * The numbers that used to stand here ("20 to 30 minutes a module", "86
 * diagrams and figures", the hours of reading) were cut by the author, so the
 * page states no count at all.
 *
 * `x` is where the sign hangs on the street, in the art's own units; `art` names
 * the scene behind it; `hue` is a category token borrowed as an accent, the way
 * the concept drew them.
 */
const STALLS: ReadonlyArray<{
  art: ArtName
  icon: ArtName
  hue: string
  x: number
  title: string
  sub?: string
  body: string
}> = [
  {
    art: 'stall-scribe',
    icon: 'icon-1',
    hue: 'var(--color-category-1)',
    x: 1510,
    title: 'Written by Humans. No AI Slop.',
    body:
      'LLMs only know what shows up often enough in their training data. The newest AI engineering '
      + 'topics are not there yet, so a model cannot teach them well. Every module here is written '
      + 'by AI engineers who build this for a living.',
  },
  {
    art: 'stall-scale',
    icon: 'icon-2',
    hue: 'var(--color-category-4)',
    x: 2710,
    title: 'We only cover what matters.',
    sub: 'A cheatsheet for AI engineering, not a textbook.',
    body:
      'Learn the most important topics here. Learn the details yourself later. We teach the ideas '
      + 'that matter most, and nothing else.',
  },
  {
    art: 'stall-pictures',
    icon: 'icon-3',
    hue: 'var(--color-category-5)',
    x: 3910,
    title: 'Pictures do most of the work.',
    body:
      'Every module comes with pictures, diagrams and code. Often there are memes too, and '
      + 'sometimes even a little brain rot, because a good meme can explain an idea in one look.',
  },
  {
    art: 'stall-papers',
    icon: 'icon-4',
    hue: 'var(--color-category-3)',
    x: 5110,
    title: 'Every module points you somewhere next.',
    body:
      'Each module ends with links to extra articles, sources and videos, for when you want to go deeper.',
  },
]

/** The concept draws five doors; a sixth level would reuse the first drawing. */
const DOOR_ART = 5

/** Where the doors and the way in stand in the hall, in the art's own units. */
const DOOR_X = 6485
const DOOR_STEP = 230
const DOOR_Y = 252
const CTA_AT = { x: 7040, y: 800 }

/** A custom property on an element; React writes custom properties unitless. */
function at(props: Record<string, string | number>): CSSProperties {
  return props as CSSProperties
}

/**
 * The front door: Bazaar Street (D79).
 *
 * ## What it is
 *
 * The author asked for a home page that surprises a reader, with art and with
 * things that move as the page scrolls, and chose this one of three concepts on
 * 2026-10-12. A reader walks into a covered bazaar: the headline sits over its
 * gate, each of the four mottos hangs on a sign over a stall that acts it out,
 * and the street ends at one door per level.
 *
 * ## How it is built, and why that way round
 *
 * **Everything a reader reads is here, server-rendered, on the language's
 * tokens**: the headline, the lede, the four mottos, the five doors and the way
 * in. With no script, with reduced motion and on a phone, that is the whole
 * page, laid out as a stack, and it is complete. **The art is beside it**, read
 * from files at build time (`street/art.ts`), and **the motion is one island**
 * (`BazaarStreetMotion`) that turns the stack into a walk on a wide screen.
 *
 * ## What is derived
 *
 * The doors are the course's levels, from `curriculum.yaml`: one per category,
 * in its order, named by its title, opening its own level page, and coloured by
 * `data-cat` like every other level mark on the site. A level added to the
 * curriculum gets a door without this file changing.
 *
 * ## What left, and where it went
 *
 * The lead action `Start with <first module>` and the facts strip were removed
 * by the author; the way in is the catalog, which lists the whole course. The
 * "Why this and not the hundredth AI blog" panel became the four stalls.
 */
export default function HomePage() {
  const doors = CATEGORIES.map((category, i) => ({
    slug: category.slug,
    title: category.title,
    href: levelRoute(category.slug),
    art: `door-${(i % DOOR_ART) + 1}` as ArtName,
    x: DOOR_X + i * DOOR_STEP,
  }))

  return (
    /* No trail: a crumb reading `Home` on the home page names the page the
       bar's current chip already marks, and the street runs edge to edge
       under the bar. */
    <PageShell column={false} trail={false}>
      <div id="bazaar" className="bz-street">
        <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: art('defs') }} />

        <section className="gate" id="gate" aria-labelledby="home-title">
          <div className="gate-copy">
            {/* §15.2.2 — one h1 for one document. The break is the author's line
                break; the space before it keeps the text one sentence. */}
            <h1 id="home-title" className={`bz-hero-title ${display.className}`}>
              AI engineering,{' '}
              <br />
              written by the people who build it.
            </h1>
            <p className="bz-lede">AI engineering, made simple, short and useful.</p>
            <Link className="bz-btn" href={INDEX_ROUTE}>
              Open the curriculum
            </Link>
          </div>
          <div className="gate-arch" aria-hidden="true">
            <div className="arch-box" id="archBox" dangerouslySetInnerHTML={{ __html: art('gate') }} />
          </div>
        </section>

        <section className="mottos" aria-label="Why this course">
          <div className="mottos-in">
            {STALLS.map((stall) => (
              <article key={stall.art} className="stall" style={at({ '--hue': stall.hue })}>
                <div className="stall-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: art(stall.art) }} />
                <div className="sign" style={at({ '--x': stall.x, '--y': 224, '--hue': stall.hue })}>
                  <div className="rail" />
                  <div className="swing">
                    <div className="board">
                      <h2 className={display.className}>
                        <span className="ico-slot" aria-hidden="true" dangerouslySetInnerHTML={{ __html: art(stall.icon) }} />
                        {stall.title}
                      </h2>
                      {stall.sub && <p className={`sub ${display.className}`}>{stall.sub}</p>}
                      <p>{stall.body}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="end">
          <nav className="doors" aria-label="Levels">
            {doors.map((door) => (
              <Link
                key={door.slug}
                className="door"
                href={door.href}
                data-cat={door.slug}
                style={at({ '--x': door.x, '--y': DOOR_Y })}
              >
                <span className="plaque">{door.title}</span>
                <span className="door-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: art(door.art) }} />
              </Link>
            ))}
          </nav>
          <div className="cta-wrap" style={at({ '--x': CTA_AT.x, '--y': CTA_AT.y })}>
            <Link className="bz-btn" href={INDEX_ROUTE}>
              Open the curriculum
            </Link>
          </div>
        </section>

        {/* The walk: a template the motion clones on a wide screen. Inert
            otherwise, and hidden so its art is never laid out twice. */}
        <div hidden dangerouslySetInnerHTML={{ __html: art('walk') }} />
      </div>
      <BazaarStreetMotion rootId="bazaar" />
    </PageShell>
  )
}
