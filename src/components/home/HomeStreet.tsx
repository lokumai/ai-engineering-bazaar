import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { BazaarStreetMotion } from '@/components/home/BazaarStreetMotion'
import { CastAtGate, CastRow } from '@/components/home/Cast'
import { art, type ArtName } from '@/components/home/street/art'
import { PageShell } from '@/components/shell/PageShell'
import { CATEGORIES } from '@/lib/content/curriculum-file'
import { type ReadingLang, TRANSLATED_LANGS, dirOf, homeRoute, langAttr } from '@/lib/content/languages'
import { HOME_COPY, type StallId, type TrackId } from '@/lib/home-copy'
import { INDEX_ROUTE, levelRoute } from '@/lib/route-labels'
import { SITE_NAME } from '@/lib/site'
import { href } from '@/lib/url'

/**
 * §15.2.2 — one document, so one title, and it claims nothing about the reader.
 *
 * `title.absolute`, because the root layout's template would print the site's
 * name twice, and the name is the site's in every language: the title does not
 * translate. The description says what the place is and states no number, and it
 * is the language's own (`lib/home-copy.ts`).
 *
 * **Each address names the other two**, the way a module's pages do
 * (`sheetMetadata`): `hreflang` says the three are translations of each other and
 * `canonical` says each is the original of itself. Emitted on all three and
 * pointing at all three, because an alternate declared in one direction only is
 * the half a crawler ignores; `x-default` is English, the address a reader with no
 * preference is sent to. `href()` and not a bare path, for the module pages'
 * reason: Next applies `basePath` to links and not to a string in `alternates`.
 */
export function homeMetadata(lang: ReadingLang): Metadata {
  return {
    title: { absolute: SITE_NAME },
    description: HOME_COPY[lang].description,
    alternates: {
      canonical: href(homeRoute(lang)),
      languages: {
        ...Object.fromEntries((['en', ...TRANSLATED_LANGS] as ReadingLang[]).map((one) => [one, href(homeRoute(one))])),
        'x-default': href(homeRoute('en')),
      },
    },
  }
}

/**
 * The four stalls, where each hangs and what it acts out (D79).
 *
 * The mottos are the author's words, written rather than counted, and on
 * purpose: they are what the course promises, not facts about the corpus, so
 * there is nothing to derive them from. They live in `lib/home-copy.ts`, one set
 * per language, under the `id` here. The numbers that used to stand beside them
 * ("20 to 30 minutes a module", "86 diagrams and figures", the hours of reading)
 * were cut by the author, so the page states no count at all.
 *
 * `x` is where the sign hangs on the street, in the art's own units; `art` names
 * the scene behind it; `hue` is a category token borrowed as an accent, the way
 * the concept drew them.
 */
const STALLS: ReadonlyArray<{
  id: StallId
  art: ArtName
  icon: ArtName
  hue: string
  x: number
}> = [
  { id: 'draft', art: 'stall-draft', icon: 'icon-1', hue: 'var(--color-category-1)', x: 1510 },
  { id: 'sieve', art: 'stall-sieve', icon: 'icon-2', hue: 'var(--color-category-4)', x: 2710 },
  { id: 'lantern', art: 'stall-lantern', icon: 'icon-3', hue: 'var(--color-category-5)', x: 3940 },
  { id: 'signpost', art: 'stall-signpost', icon: 'icon-4', hue: 'var(--color-category-3)', x: 5140 },
]

/** The concept draws five doors, and a tray for each; a sixth level would reuse the first. */
const DOOR_ART = 5

/**
 * Where everything after the four stalls stands in the hall, in the art's own
 * units. The track choice takes the 1560 units between the last stall and the
 * doors: two bays, the Sipahi's stall and the merchant's, each under a sign
 * that is a button. `art/track-*.html` draw those bays at exactly these widths
 * (760 and 800), so the hall, the doors and the way in stand `HALL_SHIFT`
 * further along than the concept drew them.
 */
const TRACK_START = 6240
const HALL_SHIFT = 1560
const DOOR_X = 6485 + HALL_SHIFT
const DOOR_STEP = 230
const DOOR_Y = 252
const CTA_AT = { x: 7040 + HALL_SHIFT, y: 786 }

/** The question hangs over the gap between the two stalls. */
const QUESTION_AT = { x: TRACK_START + 820, y: 40 }
/** M46 — the signs hang close under the question, so more of the stalls shows. */
const SIGN_Y = 195

/**
 * The characters stand beside their stalls; each caption is centred under its character.
 * The sign's words and the character's story are the language's (`lib/home-copy.ts`);
 * the character's NAME is not, and is written here, as it is written in every language.
 */
const TRACKS: ReadonlyArray<{
  id: TrackId
  art: ArtName
  hue: string
  signX: number
  /** M63: the character tells a story in a cloud, like the people at the gate's. */
  who: { name: string; x: number; left: number }
}> = [
  {
    id: 'eng',
    art: 'track-eng',
    hue: 'var(--color-category-2)',
    /** The centre of the stall the sign hangs over. */
    signX: TRACK_START + 545,
    who: { name: 'Sipahi', x: TRACK_START + 190, left: 24.4 },
  },
  {
    id: 'all',
    art: 'track-all',
    hue: 'var(--color-category-1)',
    signX: TRACK_START + 760 + 335,
    who: { name: 'Bezirgân', x: TRACK_START + 760 + 645, left: 81.4 },
  },
]

/** The For Everyone track lives under its own prefix; a level opens at the same address inside it. */
const everyoneRoute = (slug: string) => `/everyone${levelRoute(slug)}`

/** `</>` for the track about the code, an open book for the one about the ideas. */
function TrackIcon({ track }: { track: 'eng' | 'all' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {track === 'eng' ? (
        <path d="M8 6 2.5 12 8 18M16 6l5.5 6-5.5 6M13.5 4l-3 16" />
      ) : (
        <path d="M12 6.5C9.5 4.8 6.2 4.5 3 5v13c3.2-.5 6.5-.2 9 1.5 2.5-1.7 5.8-2 9-1.5V5c-3.2-.5-6.5-.2-9 1.5Zm0 0V19.5" />
      )}
    </svg>
  )
}

/** The mark that says a sign is chosen without a colour: a tick, beside the word. */
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  )
}

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
 * ## The welcome at each door
 *
 * Pointing at a door, or reaching it with the keyboard, brings a brass tray of
 * lokum out of the doorway: the bazaar's way of offering a guest a sweet (the
 * author asked for exactly that on 2026-10-14, after the README's photograph).
 * Each tray is drawn in its door's own coordinates (`art/tray-N.html`), with the
 * stall's platter and cubes and that level's colour on top, so it lines up with
 * the door at any size. The motion is the island's; with no script or with
 * reduced motion, `home.css` shows the tray on hover and focus without moving it.
 *
 * ## The stalls, and the choice before the doors (M44)
 *
 * On 2026-11-05 the author picked the scene each stall acts out (the edited
 * draft, the sieve, the magic lantern, the signpost: `art/stall-*.html`, moved
 * by `street/stall-timelines.ts`) and a step between the stalls and the doors.
 * The reader is asked how they would like to read, and the five doors open into
 * the track they pick: For Engineers at `/sheets/<level>/`, For Everyone at
 * `/everyone/sheets/<level>/`. Two stalls stand side by side under two signs
 * that are buttons, the Sipahi beside the first and the Bezirgân beside the
 * second. Every door is rendered For Engineers, with the other address beside it
 * in `data-href-all`, so with no choice and no script the doors open For
 * Engineers and a link checker reads an address that always exists;
 * `street/track.ts` swaps them. Nothing is saved.
 *
 * ## Three languages, one component (D80)
 *
 * The author's rule of 2026-11-09 is that **only content is multilingual, never
 * menus**. `/`, `/tr/` and `/fa/` render this one component with
 * `lang` = `en`, `tr` or `fa`, and every sentence comes from `lib/home-copy.ts`
 * under that language. Three decisions follow, each the module pages' own, which
 * the home page inherits rather than reinvents (`languages.ts`):
 *
 * - **The language is on the words, and on nothing round them.** `lang` and, for
 *   Persian, `dir="rtl"` go on the elements that hold the translated text (the
 *   headline, a sign's paragraph, a cloud) and never on `<html>`, a section or the
 *   scene. The street, the gate, the walk and the art do not mirror: what is drawn
 *   does not flip, and a `dir` on a section would reverse its grid. So the signs
 *   hang where they always hung and only the lines inside them read right to left.
 *   The icon beside a sign's title stays at the left (`home.css`).
 * - **The face is the language's, and only its text is set in it.** `displayClass`
 *   is the route's display face: Fraunces for English and Turkish (the latter
 *   preloading the Latin Extended file, which carries the dotless i, the cedilla
 *   and the breve), and nothing for Persian, whose text takes Vazirmatn from `[lang="fa"]`
 *   (`prose.css`) through the `--font-persian` variable its route binds.
 * - **What leaves the page is English.** Every link goes to the same address it
 *   goes to from `/`: the catalog and each level are the English ones, and so are
 *   the bar, the menus and the footer, which this component does not touch. The
 *   levels on the doors are the catalog's own titles. The names of the nine
 *   characters are names, and the words painted inside the scenes are drawing.
 *
 * Nothing chooses the language for the reader: `/` stays English, no browser
 * setting is read and no banner offers a switch. The bar's language menu lists the
 * three addresses on this page (`LanguageMenu`).
 *
 * ## What left, and where it went
 *
 * The lead action `Start with <first module>` and the facts strip were removed
 * by the author; the way in is the catalog, which lists the whole course. The
 * "Why this and not the hundredth AI blog" panel became the four stalls.
 */
export function HomeStreet({ lang, displayClass }: { lang: ReadingLang; displayClass: string }) {
  const copy = HOME_COPY[lang]
  /* What a translated text element carries; both are undefined for English, which is the
     document's own language and direction, so the English page is unchanged. */
  const text = { lang: langAttr(lang), dir: dirOf(lang) }
  const doors = CATEGORIES.map((category, i) => ({
    slug: category.slug,
    title: category.title,
    href: levelRoute(category.slug),
    hrefEveryone: everyoneRoute(category.slug),
    art: `door-${(i % DOOR_ART) + 1}` as ArtName,
    tray: `tray-${(i % DOOR_ART) + 1}` as ArtName,
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
            <h1 id="home-title" className={`bz-hero-title ${displayClass}`} {...text}>
              {copy.hero.first}{' '}
              <br />
              {copy.hero.second}
            </h1>
            <p className="bz-lede" {...text}>{copy.hero.lede}</p>
            <Link className="bz-btn" href={INDEX_ROUTE} {...text}>
              {copy.hero.open}
            </Link>
          </div>
          {/* The art is hidden from assistive technology and the people standing in
              front of it are not: each is a button with a caption and a story (M58). */}
          <div className="gate-arch">
            <div className="arch-box" id="archBox" aria-hidden="true" dangerouslySetInnerHTML={{ __html: art('gate') }} />
            <CastAtGate lang={lang} />
          </div>
        </section>
        <CastRow lang={lang} />

        <section className="mottos" aria-label={copy.mottosLabel}>
          <div className="mottos-in">
            {STALLS.map((stall) => {
              const motto = copy.mottos[stall.id]
              return (
              <article key={stall.art} className="stall" style={at({ '--hue': stall.hue })}>
                <div className="stall-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: art(stall.art) }} />
                <div className="sign" style={at({ '--x': stall.x, '--y': 224, '--hue': stall.hue })}>
                  <div className="rail" />
                  <div className="swing">
                    <div className="board">
                      <h2 className={displayClass} {...text}>
                        <span className="ico-slot" aria-hidden="true" dangerouslySetInnerHTML={{ __html: art(stall.icon) }} />
                        {motto.title}
                      </h2>
                      {motto.sub && <p className={`sub ${displayClass}`} {...text}>{motto.sub}</p>}
                      <p {...text}>{motto.body}</p>
                    </div>
                  </div>
                </div>
              </article>
              )
            })}
          </div>
        </section>

        <section className="choice" id="track" aria-labelledby="track-q">
          <div className="choice-in">
            <div className="sign question" style={at({ '--x': QUESTION_AT.x, '--y': QUESTION_AT.y, '--hue': 'var(--color-category-4)' })}>
              <div className="rail" />
              <div className="swing">
                <div className="board">
                  <h2 id="track-q" className={displayClass} {...text}>{copy.question}</h2>
                </div>
              </div>
            </div>
            <div className="tracks">
              {TRACKS.map((track) => {
                const words = copy.tracks[track.id]
                return (
                <article key={track.id} className="track" data-track={track.id}>
                  <div className="sign track-sign" style={at({ '--x': track.signX, '--y': SIGN_Y, '--hue': track.hue })}>
                    <div className="rail" />
                    <div className="swing">
                      <button type="button" className="board" data-choose={track.id} aria-pressed="false">
                        <span className="sg-head">
                          <span className="sg-ico" aria-hidden="true">
                            <TrackIcon track={track.id} />
                          </span>
                          <span className={`sg-t ${displayClass}`} {...text}>{words.name}</span>
                        </span>
                        <span className="sg-p" {...text}>{words.body}</span>
                        <span className="sg-go">
                          <span className="sg-off" {...text}>{words.choose}</span>
                          <span className="sg-on" {...text}>
                            <CheckIcon />
                            {copy.chosen}
                          </span>
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="track-art">
                    <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: art(track.art) }} />
                    {/* M63: the caption is a button that tells the character's story, as the
                        people at the gate do (`street/clouds.ts`). */}
                    <button
                      type="button"
                      className="who who-story"
                      aria-describedby={`story-${track.id}`}
                      style={at({ '--x': track.who.x, '--y': 800, '--l': `${track.who.left}%`, '--hue': track.hue })}
                      {...text}
                    >
                      <span lang="tr">{track.who.name}</span> ({words.teller.alias})
                      <span className="who-cloud" id={`story-${track.id}`} aria-hidden="true">
                        {words.teller.story}
                      </span>
                    </button>
                  </div>
                </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="end">
          {/* A menu of levels, so its name stays English on every address (D113). */}
          <nav className="doors" aria-label="Levels">
            {doors.map((door) => (
              <Link
                key={door.slug}
                className="door"
                href={door.href}
                data-cat={door.slug}
                data-href-eng={door.href}
                data-href-all={door.hrefEveryone}
                style={at({ '--x': door.x, '--y': DOOR_Y })}
              >
                <span className="plaque">{door.title}</span>
                <span className="door-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: art(door.art) + art(door.tray) }} />
              </Link>
            ))}
          </nav>
          <div className="cta-wrap" style={at({ '--x': CTA_AT.x, '--y': CTA_AT.y })}>
            {/* With no script the doors open For Engineers and this says so; the
                switch is a button, so it stays hidden until the island can work it. */}
            <p
              className="switch"
              data-switch-line
              data-name-eng={copy.tracks.eng.name}
              data-name-all={copy.tracks.all.name}
              {...text}
            >
              {copy.opens.lead}<b data-track-name>{copy.tracks.eng.name}</b>{copy.opens.tail}{' '}
              <button type="button" className="sw-link" data-switch hidden>
                {/* One child: the button is inline-flex on a phone, which would make each text run its own item and drop the spaces between them. */}
                <span>
                  {copy.other.lead}<span data-track-other>{copy.tracks.all.name}</span>{copy.other.tail}
                </span>
              </button>
            </p>
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
