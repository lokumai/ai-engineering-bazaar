import type { Metadata } from 'next'
import Link from 'next/link'
import { PageShell } from '@/components/shell/PageShell'
import { corpusTotals, moduleLengthRange, sheetRows, type LengthRange } from '@/lib/content/manifest'
import { INDEX_ROUTE } from '@/lib/route-labels'
import { SITE_NAME } from '@/lib/site'
import { hoursMinutes } from '@/lib/text'

/**
 * §15.2.2 — one document, so one title, and it claims nothing about the reader.
 *
 * `title.absolute` rather than a bare string: the root layout sets the template
 * `%s · AI Engineering Bazaar`, and a plain `title: SITE_NAME` here would print
 * the site's name twice in the tab. The rejected alternative was to export no
 * `metadata` at all and inherit the layout's default — which gives the right
 * title but leaves the front door describing itself with the site-wide
 * description, the one string on the site that spells a module count into prose.
 * The home page states its counts where they are measured, so the description
 * states the shape of the place and no number.
 *
 * "Where you left off" and "Welcome back" are both refused here: one document
 * serves every reader and the tab is written once, at build time, for a reader
 * the build has never met.
 */
export const metadata: Metadata = {
  title: { absolute: SITE_NAME },
  description:
    'The front door: what this course is, the module to start on, how far you '
    + 'are through it, and where your reading is kept.',
}

/**
 * M13 / M18 — the home page. **Two rows: the banner, then the argument.**
 *
 * ## What it is now, and what it stopped being
 *
 * The author chose home **A** out of three in M13: a landing page answering
 * *what is this, why this and not the hundredth AI blog, and where do I start*
 * in one screen, with the levels doubling as the table of contents. **M18 took
 * the levels off it**, on his own shape for the front door: *"Homepage should
 * have the refined banner row, and the next row should be the existing boxes
 * which is 'Why this and not the hundredth AI blog'."*
 *
 * So what is left is what a stranger needs and nothing that reports on a reader
 * this document has never met. Three things went, and each one had somewhere
 * else to be:
 *
 * - **completion control C**, which was D14's second home for it, is on
 *   `/profile/` — the page named for it, one click away in the bar;
 *   `CourseCompletion` is unchanged and still carries the reasoning;
 * - **the continue line**, which read `Continue · Module 01 · LLM
 *   Fundamentals`. It was the last thing on this page keyed off
 *   `data-hl-record`, and the stamp stays because the catalog's view reveal and
 *   the progress page both read the record;
 * - **the levels as a table of contents**. That is the one real loss and it is
 *   named in the markup below: the catalog is where the whole course is
 *   listed, which after M17 is true of exactly one page.
 *
 * ## Every number here is measured, and M18 made one more of them a number
 *
 * Not one count in this file is typed (§11.25). The strip is `corpusTotals()`,
 * the first module is `sheetRows()[0]` — and the LEDE is `moduleLengthRange()`,
 * because it was printing *five to ten minutes* over a corpus whose shortest
 * module declares twenty. A sentence with a number in it is a count like any
 * other. Break a derivation and the page changes, which is the test M13 asks
 * for.
 *
 * **The lead action's target is a slug, not a number.** The first entry point is
 * the first row of the set as the corpus orders it, because the set has been
 * renumbered once already: a number is a label and a slug is an identity
 * (§12.1.3).
 *
 * ## What the page refuses to draw
 *
 * No hero image, no gradient, and no "get started" control that leads to a
 * second choice (§11.3, §15.2.4) — the primary action is the first module. No
 * percentage (§11.35). No modal, no banner and no dismissible box over the
 * identity strip, and no sentence anywhere claiming that signing in saves what
 * the browser is already keeping (§15.5.4). And nothing on it requires an
 * account: signed out is the default and it is complete.
 */
/**
 * THE PROMISE, IN THE README'S OWN WORDS — and it is the one block of copy on
 * this page that is written rather than counted.
 *
 * The five paragraphs it replaces described the course to itself: how many
 * modules were ready, how many planned, what a reader may tick, where the
 * record is kept. All true, and all of it said in prose what the page already
 * SHOWS three inches lower — the levels carry their own counts and the marks
 * carry their own state. A caption under a picture of the same thing is not
 * information, it is noise.
 *
 * Three sentences, from `README.md`'s "Why This Is Valuable": rule 1 (people who
 * build this write it), rule 4 (how long a module takes), rule 5 (pictures do
 * the work), in rule 3's plain language — readable by somebody whose first
 * language is not English, which is the audience `MANIFESTO.md` §4 names.
 *
 * ## M18 corrected two of the three, and one of them was a number
 *
 * **"Five to ten minutes a module" was wrong**, and measurably: nineteen
 * modules declare a duration, the shortest is 20 minutes and the longest is 30.
 * So the sentence counts rather than claims — `moduleLengthRange()` reads the
 * corpus and a module that gets longer moves the promise with it. It is §11.25
 * applied to a sentence instead of to a facts strip, and it is why this is a
 * function now rather than a constant array.
 *
 * **"Written by an engineer" was singular and the thing is written by AI
 * engineers.** The author's correction, and it reaches the headline above the
 * lede too: `08`'s own text reads *"AI engineering, written by someone who
 * builds it"*. The mockup outranks the design document and the author outranks
 * the mockup (`DESIGN.md`'s order of authority), so it is a recorded
 * `DEVIATIONS` entry rather than a quiet edit.
 */
function ledeFor({ shortest, longest }: LengthRange): readonly string[] {
  return [
    'AI engineering, made short and useful.',
    'Written by AI engineers who build this for a living, in plain words.',
    `${shortest} to ${longest} minutes a module, and the pictures do most of the work.`,
  ]
}

export default function HomePage() {
  const rows = sheetRows()
  const totals = corpusTotals()
  const lede = ledeFor(moduleLengthRange())

  // The first row of the set: the module the primary action opens.
  const first = rows[0]

  return (
    <PageShell column={false}>
      <div className="bz-hero">
        {/* §15.2.2 — one h1 for one document, and it says what the place is
            rather than repeating the wordmark two rows above it. */}
        <h1 className="bz-hero-title">
          AI engineering, written by the people who build it.
        </h1>

        {/* WHY TO READ IT, NOT WHAT IT CONTAINS.
            This was five paragraphs describing the course to itself — how many
            modules are ready, how many are planned, where the record is kept,
            what a reader may tick. Every sentence was true and every one of
            them said something the page already SHOWS: the levels below carry
            their own counts, the marks carry their own state.
            What replaces it is the promise, in the README's own words. Three
            short sentences, plain enough for a reader whose first language is
            not English, which is rule 3. */}
        <div className="bz-lede">
          {lede.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        {/* NO CONTINUE LINE. It read `Continue · Module 01 · LLM Fundamentals`
            and the author had it removed: the front door is the argument for
            reading this, and a reader with a record is one click from their
            place through `Your progress` in the bar. What it cost is that
            `data-hl-record` has no consumer on this page any more — the stamp
            stays, because the catalog's own reveal and the progress page both
            read the record, and `boot.ts` owns it. */}

        <div className="bz-hero-actions">
          {/* DESIGN.md, Components — one `button-primary` per screen region,
              and this is the home page's. §15.2.4: the primary action opens a
              module rather than a menu. */}
          <Link className="bz-btn" href={first.path}>
            Start with {first.title}
          </Link>
          <Link className="bz-btn" href={INDEX_ROUTE}>
            Browse the catalog
          </Link>
        </div>

        {/* The four facts, each one counted from the corpus. A dash is
            impossible here: these are measurements of the repository, so the
            honest empty form of any of them is a zero somebody counted. */}
        <ul className="bz-facts">
          <li>
            <span className="bz-facts-value">{hoursMinutes(totals.minutes)}</span>
            of reading
          </li>
          <li>
            <span className="bz-facts-value">{totals.figures}</span>
            diagrams and figures
          </li>
          <li>
            <span className="bz-facts-value">{totals.sources}</span>
            sources cited
          </li>
        </ul>
      </div>

      {/* NO PROGRESS FEATURE. D14 put completion control C here — every level,
          every module, a dial each, and three statistics above them — and M18
          takes it off this page and leaves it on `/profile/`, which is the page
          named for it.

          The author's shape for the front door is two rows: the banner, then
          the argument. Control C was a third thing, it was the only thing on
          the page that could say nothing true to a stranger, and `/profile/` is
          one click away in the bar for a reader who has one.

          **What this costs, named rather than discovered:** the level cards
          were the home page's table of contents, so `home.spec.ts`'s claim that
          every module in the course is reachable from here does not survive.
          It moved to the catalog, which after M17 is the one place the whole
          course is listed. */}

      {/* Home A's second half: the argument for reading this rather than the
          next thing a search returns. Four claims, each one checkable against
          the corpus itself, and none of them about the reader. */}
      <section className="bz-panel" aria-labelledby="bz-home-why">
        <div className="bz-panel-head">
          <h2 id="bz-home-why" className="bz-panel-title">
            Why this and not the hundredth AI blog
          </h2>
          {/* NO NOTE. It read `Four reasons, all of them checkable` over four
              reasons a reader can count, each already stating what it can be
              checked against. MANIFESTO rule 16. */}
        </div>
        {/* `08:179-182` draws a glyph beside each claim, in a 28px tinted
            tile — and it draws them as LITERAL EMOJI: a writing hand, a speech
            balloon, a ruler, a rising chart. Emoji are not this design's icon
            idiom and never have been: `src/` carries twenty inline SVGs and no
            emoji at all, on a 16-unit viewBox with `fill="none"` and
            `stroke="currentColor"`, and `01:172-178` records why a shape with a
            fill beats a hairline glyph where meaning depends on it. An emoji
            also renders in whatever face the reader's platform ships, at a size
            nothing here chose, and says something different on each one.

            So the four are redrawn on that grid, keeping what each one MEANT
            rather than tracing it: a nib, a pair of quotes, a rule with two
            ticks, and a rising line. The tile survives the swap unchanged
            because it was always sized for a glyph — and it is an edge rather
            than `08`'s tint, which is the answer D33 already gave for the level
            badge. */}
        <dl className="bz-why">
          <div>
            <span className="bz-why-mark" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 13l1-3 7-7 2 2-7 7-3 1z" />
                <path d="M10.5 3.5l2 2" />
              </svg>
            </span>
            <dt>A person wrote it</dt>
            <dd>
              Most of this is too new for a model to have read anything reliable
              about. Every claim comes from a primary source, dated, and the
              module says which.
            </dd>
          </div>
          <div>
            <span className="bz-why-mark" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z" />
              </svg>
            </span>
            <dt>It reads like being told</dt>
            <dd>
              Ask an engineer in person and you get a straight answer with the
              caveats attached. That is the voice here.
            </dd>
          </div>
          <div>
            <span className="bz-why-mark" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M1.5 6h13v4h-13z" />
                <path d="M5 6v2M8 6v2.8M11 6v2" />
              </svg>
            </span>
            <dt>Short on purpose</dt>
            <dd>
              {hoursMinutes(Math.round(totals.minutes / Math.max(1, totals.ready)))} a
              module on average, then links out when you want more.
            </dd>
          </div>
          <div>
            <span className="bz-why-mark" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12l4-4 3 2 5-5" />
                <path d="M10.5 5h3.5v3.5" />
              </svg>
            </span>
            <dt>The pictures do the work</dt>
            <dd>
              {totals.figures} diagrams and figures, because a loop is easier to
              see than to read.
            </dd>
          </div>
        </dl>
      </section>

    </PageShell>
  )
}
