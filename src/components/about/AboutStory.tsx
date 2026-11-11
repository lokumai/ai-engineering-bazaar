import type { ReactNode } from 'react'
import type { Story } from '@/lib/content/story'
import { ABOUT_TITLES } from '@/lib/about-copy'
import { type ReadingLang, dirOf, langAttr } from '@/lib/content/languages'
import { AboutMotion } from './AboutMotion'
import { aboutPaletteCss } from './palette'
import { BrainrotScene } from './scenes/BrainrotScene'
import { EngravingScene } from './scenes/EngravingScene'
import { HaystackScene } from './scenes/HaystackScene'
import { PendingScene } from './scenes/PendingScene'
import { SealScene } from './scenes/SealScene'
import { TreatyScene } from './scenes/TreatyScene'

/**
 * M90, D115 — the About page: the story of the Bazaar in five stalls and a motto.
 *
 * Reference: `playground/2026-11-round-5/R0-about-design.html?bg=B2&feel=F1`, the author's pick of a
 * ground ("Dusk to dawn") and a feel ("Procession"), with the change he asked for: each stall's
 * heading is set smaller and runs the width of the text under it, so most take one or two lines
 * ("most of the time", his words; MEASURED at 1440, 1280 and 390: four of the five in one or two,
 * stall 5's question in three). The
 * scenes are his picks from `R1` to `R5`, each un-boxed (see each scene's own header).
 *
 * **Everything a reader reads comes from `mini-courses/STORY.md`**, passed in as `story`: one stall
 * per `##` section, in file order, and the motto from the closing line. The page writes only its own
 * name and the labels a reader never sees. A scene belongs to a stall by POSITION, the way a module's
 * number is its place in the curriculum: `SCENES[i]` is drawn beside the i-th section, and a section
 * the art has not reached yet (a sixth `##`, say) gets the pending slot until it is drawn.
 *
 * This component is the whole page as the server renders it, and it is complete: every word is in the
 * markup and every scene is a still picture, so with no script, or under `prefers-reduced-motion`,
 * the story reads top to bottom with nothing hidden and nothing pinned. `AboutMotion` is the one
 * island; it imports `gsap` on demand and turns the same markup into the procession.
 */

export interface AboutFonts {
  /** `next/font`'s class for Fraunces, the display face, for the headings. */
  displayClass: string
  /** The same face's family, for text inside the SVG scenes. */
  display: string
  /** Caveat's family, the hand the doodles in stall 4 are written in. */
  hand: string
}

function scenes(fonts: AboutFonts): ReactNode[] {
  return [
    <TreatyScene key="1" display={fonts.display} displayClass={fonts.displayClass} />,
    <HaystackScene key="2" />,
    <SealScene key="3" />,
    <BrainrotScene key="4" hand={fonts.hand} display={fonts.display} />,
    <EngravingScene key="5" display={fonts.display} />,
  ]
}

/** The gate arch the hero and the motto stand in (F1). */
function Arch({ finial }: { finial: boolean }) {
  return (
    <svg className="arch" viewBox="250 70 500 560" aria-hidden="true" focusable="false">
      <path className="arch-out" d="M280,620V330C280,184.3 394.4,118.5 500,95C605.6,118.5 720,184.3 720,330V620" />
      <path className="arch-in" d="M296,620V334C296,198 402,136 500,114C598,136 704,198 704,334V620" />
      {finial && <rect className="arch-finial" x="494" y="74" width="12" height="12" transform="rotate(45 500 80)" />}
    </svg>
  )
}

/**
 * The page's name is its crumb's on the English page (`lib/route-labels.ts`) and its own in each
 * translation (`lib/about-copy.ts`); its first word is set apart, as F1 draws it.
 */
function titleParts(lang: ReadingLang): [string, string] {
  const [lead, ...rest] = ABOUT_TITLES[lang].split(' ')
  return [lead, rest.join(' ')]
}

export function AboutStory({ story, fonts, lang = 'en' }: { story: Story; fonts: AboutFonts; lang?: ReadingLang }) {
  const art = scenes(fonts)
  const [titleLead, titleRest] = titleParts(lang)
  // D80: language and direction sit on the elements that hold the story's words, never on the page
  // or the scenes, which are drawn the same in every language.
  const text = { lang: langAttr(lang), dir: dirOf(lang) }
  const { motto } = story
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: aboutPaletteCss() }} />
      <div id="about" className="bz-about">
        <div className="ground" aria-hidden="true" />

        <section className="hero" data-sec="hero" aria-labelledby="about-title">
          <div className="hero-in">
            <Arch finial />
            <h1 id="about-title" className={fonts.displayClass} {...text}>
              <span className="h1a">{titleLead}</span> <span className="h1b">{titleRest}</span>
            </h1>
          </div>
          <span className="cue" aria-hidden="true" />
        </section>

        {story.stalls.map((stall, i) => (
          <section
            key={i}
            className={i % 2 === 1 ? 'stall flip' : 'stall'}
            id={`stall-${i + 1}`}
            data-sec={i + 1}
            aria-labelledby={`stall-${i + 1}-h`}
          >
            <div className="stall-in">
              <div className="copy">
                <span className="num" aria-hidden="true">
                  <i className="num-d" />
                  <span className={`num-n ${fonts.displayClass}`}>{i + 1}</span>
                </span>
                <h2 id={`stall-${i + 1}-h`} className={fonts.displayClass} {...text}>
                  {stall.heading}
                </h2>
                {stall.paragraphs.map((paragraph, j) => (
                  <p key={j} {...text}>
                    {paragraph}
                  </p>
                ))}
              </div>
              <div className="obj">
                <figure className="slot">{art[i] ?? <PendingScene />}</figure>
              </div>
            </div>
          </section>
        ))}

        {motto && (
          <section className="motto" data-sec="motto" aria-labelledby="about-motto">
            <div className="motto-in">
              <Arch finial={false} />
              <div className="motto-t">
                <p className={`motto-k ${fonts.displayClass}`} id="about-motto" {...text}>
                  {motto.lead}:
                </p>
                <p className={`motto-q ${fonts.displayClass}`} {...text}>
                  <span className="m1">{motto.lines[0]}</span>
                  {motto.lines.length > 1 && (
                    <>
                      {' '}
                      <span className="m2">{motto.lines.slice(1).join(' ')}</span>
                    </>
                  )}
                </p>
                <svg className="motto-line" viewBox="0 0 560 40" aria-hidden="true" focusable="false">
                  <path
                    className="motto-stroke"
                    d="M8,24 C60,18 110,27 168,21 C230,15 268,28 330,22 C392,16 440,26 494,19 C516,16 534,18 552,22"
                    pathLength={1}
                  />
                  <circle className="motto-dot" cx="552" cy="22" r="3.2" />
                </svg>
              </div>
            </div>
          </section>
        )}

        {/* The rail is fixed at the window's edge, so where it sits in the document decides only its
            tab order: after the story, so a keyboard reader meets the stalls first and the five
            jump links after them (review A, item 8). It stays tabbable: it is navigation. */}
        <nav className="rail" aria-label="Stalls">
          {story.stalls.map((stall, i) => (
            <a key={i} href={`#stall-${i + 1}`} data-k={i + 1}>
              <span className="rail-mark" aria-hidden="true" />
              <span className="sr-only" {...text}>
                {stall.heading}
              </span>
            </a>
          ))}
        </nav>
      </div>
      <AboutMotion rootId="about" />
    </>
  )
}
