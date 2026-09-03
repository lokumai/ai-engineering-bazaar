# Tests

The suite went from 1,948 tests to a few hundred in September 2026, because the
old one had become a tax on writing content. This file exists so it does not
grow back the same way.

## The rule

**A test may check a rule that holds for any content. It may never write down a
fact about the content.**

| A rule | A fact |
| --- | --- |
| Every image a module names exists on disk | Module 6 has three images |
| Every prerequisite exists and comes earlier | Module 9 requires 5 and 8 |
| A drawn sheet states its extent as words and minutes | Sheet 13 is 4,868 words |
| The set is numbered from one with no gaps | Security is number 13 |
| A checklist numbers its items from zero | Sheet 13 has eight checklist items |

The facts on the right were all real assertions. Every one of them turned an
ordinary edit into a red build, and not one of them ever caught a defect. The
rules on the left cannot be broken by editing a module, and between them they
catch the two defects this project has actually shipped.

## The layers, and what each is for

**`tests/corpus/renders.test.ts`** runs the whole real corpus through the
renderer and checks nine rules: it renders, no relative `.md` link survives, no
colour literal reaches a diagram, every named image exists, no image is
authored as raw HTML, every module has a Turkish sibling, prerequisites exist
and come earlier, the set is numbered from one, and each filename's number
matches the number inside it. Add a rule here when you find a defect class that
applies to any module. Never add a count.

**`tests/unit/content/kitchen-sink.test.ts`** renders one invented module,
`tests/fixtures/kitchen-sink.md`, and compares the output against a stored copy
in `__snapshots__/`. The fixture carries every structure the pipeline
understands, so changing the renderer prints a line-by-line diff of what
changed. Accept it with `npx vitest -u`, or fix what you broke.

> This stays quiet only because the input is invented and frozen. Point the
> same technique at a real module and every edit turns the build red, which is
> the mistake this suite already made once.

**The rest of `tests/unit/`** are ordinary unit tests over small inputs written
inline: the edge cases a stored output cannot express. "Do not mistake a word
for a Roman numeral." "A two-column table's first column is not a row header."
"A URL inside a code span is not an external link." Keep these. They are the
part of the suite that pays.

**`tests/e2e/features.spec.ts`** asks whether each feature works at all: sign a
sheet off and it survives a reload, the reader gets a name, the mascot draws
itself, every picture on every page loads. Four browser tests stand in for 865
unit tests that used to check the insides of those features. That trade is
deliberate: these cannot prove an internal calculation is right, and they do
catch every version of "it is broken", which is what a reader would meet.

## Before adding a test

1. Would it fail if someone edited a module? Then it is a fact. Rewrite it as a
   rule or do not write it.
2. Can the kitchen-sink fixture cover it by growing one structure? Prefer that.
3. Would a person notice this within five seconds of opening the page? Then a
   browser test is enough; do not write forty unit tests for it.
4. Prove it can fail. Break the thing on purpose, watch the test go red, put it
   back. A test never seen failing is decoration.

## Known flakes

`theme.spec.ts` and `path.spec.ts` read `<html>`'s class list inside a
`requestAnimationFrame` with the page's scripts blocked. The reading is
sometimes taken before the frame fires: observed failing three then passing six
on a re-run with nothing changed. Both files retry twice. A genuine break still
fails all three attempts.

## Eight checks that fail for a reason, not because they broke

Moved here from `README.md`, which was the only place they were written down.
When one of these goes red, the cause is usually the thing it names rather than
the test.

- **The corpus check** (`tests/corpus/`) renders every real module rather than a
  fixture, so a transform that works on a sample and dies on the content fails
  here.
- **The link gate** resolves every internal cross-reference against the routes
  that exist, and asserts no rendered HTML anywhere carries a non-external
  `href` ending in `.md`. It checks each surface the app renders markdown on:
  the module body, the sheet's summary panel and the category introductions,
  because a gate covering only the body once passed while four dead links were
  shipping.
- **The contrast check** (`tests/unit/color/contrast.test.ts`) recomputes every
  WCAG ratio in §10.1 from the live token values in `src/app/globals.css`.
  Change a colour and it fails until the spec's table is re-derived.
- **The stroke-weight check** fails on any `border-width: var(--stroke-struct)`.
  Chrome floors a border to a whole pixel, so the middle weight has to be
  *painted*, as a gradient or a height, never bordered. It caught this exact
  mistake twice.
- **The copy register** (`tests/unit/copy-register.test.ts`) scans every
  reader-visible string in the record and path layers for exclamation marks,
  praise, anthropomorphism, "just", "simply", "easy", "please", "sorry" and
  confirmshaming. Comments are stripped first, because they quote every banned
  word while explaining why it is banned. It also bans a second spelling of a
  status: the register says `NOT DRAWN`, and `NOT YET DRAWN` fails, because both
  read as correct on their own.
- **The palette check** (`tests/unit/color/lokum.test.ts`) recomputes all six
  category hues from `src/app/lokum.css`: 3:1 against three grounds in both
  themes at full and half chroma, in gamut, mutually distinguishable, and 20°
  clear of the accent pen. It also asserts the copy of those values inlined in
  the `RECORD OF WORK` matches the stylesheet, because that file has no
  stylesheet to import and a drifted hue there would be invisible.
- **The path honesty check** (`tests/unit/path/honesty.test.ts`) holds the nine
  routes to §13.4.2: real slugs, no duplicates, prerequisite order, denominators
  over written sheets only, and no unwritten sheet described as though it teaches
  something. It found two defects that twelve independent agents had passed.
- **The path evidence check** (`tests/unit/path/evidence.test.ts`) measures each
  of the 123 reasons against the sheet it cites. Genuine citations score a median
  of 100%; the same citations pointed at a different sheet score a median of 33%.
  It asserts both, so it cannot pass by being vacuous.

## Commands

```bash
npm test                 # the unit and corpus suites
npm run typecheck        # catches most of what deleted unit tests used to
npm run build            # the static export that ships
npx playwright test      # the browser suite
npx vitest -u            # accept a deliberate change to the stored output
```
