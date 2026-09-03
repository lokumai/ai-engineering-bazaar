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

## Commands

```bash
npm test                 # the unit and corpus suites
npm run typecheck        # catches most of what deleted unit tests used to
npm run build            # the static export that ships
npx playwright test      # the browser suite
npx vitest -u            # accept a deliberate change to the stored output
```
