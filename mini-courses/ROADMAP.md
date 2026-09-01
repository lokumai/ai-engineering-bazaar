# Roadmap

Where this project is going, in the order we intend to get there.

The order is deliberate. Content and platform alternate: write material, then build the thing
that makes it worth more, then write the next tier of material, then build again. Neither half
is much use running ahead of the other. A clever site with nothing to read is a demo, and a
pile of good markdown nobody returns to is a blog.

| # | What | Half | Status |
| --- | --- | --- | --- |
| 1 | Content for Fundamentals and Intermediate | content | in progress |
| 2 | The website | platform | in place, iterating |
| 3 | A daily newsletter, matched to each reader's job and position | platform | planned |
| 4 | Advanced material | content | planned |
| 5 | Chatbot features over the course content | platform | planned |
| 6 | The remaining material | content | planned |
| 7 | Generative and agentic UI, where the AI decides what the reader sees | platform | planned |

## 1. Content for Fundamentals and Intermediate

Modules 1 to 15. Fundamentals is improved in place; Intermediate is rewritten from scratch,
because the existing files are dense, citation-heavy research notes rather than the plain
explanations the manifest asks for.

This comes first for the reason the manifest gives: original human writing on topics too new
for reliable sources is the thing worth building on.

## 2. The website

Already shipped. The markdown is rendered as a set of sheets a reader works through, with
sign-off, a dependency diagram, role-based reading paths, and a record they can export. All
reader state stays in their own browser.

## 3. A daily newsletter, matched to the reader's job

One short thing a day, chosen for the reader's role and seniority rather than broadcast to
everyone. A backend engineer and a data analyst should not get the same item on the same
morning.

The site already knows a reader's role and which sheets they have signed off, so the
selection has something real to work from.

## 4. Advanced material

Modules 16 to 24, the Expert track. This waits for the Intermediate tier deliberately: the
advanced modules assume the vocabulary the earlier ones establish, and writing them first
would mean writing them twice.

## 5. Chatbot features over the course content

Let the reader ask questions of the material instead of only reading it.
[OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) is the reference point for the shape of
this. What exactly we take from it is still to be decided.

## 6. The remaining material

Ecosystem, Protocols and Specs, and the optional modules. Modules 25 to 32.

## 7. Generative and agentic UI

The last step, and the most speculative: the AI decides what appears in the interface rather
than filling in a layout we fixed in advance. A reader who is stuck on one idea and a reader
skimming for one fact do not need the same page.

This is deliberately last. It only makes sense on top of material worth adapting and a
system that already knows who is reading.

## What this is not

No promises about dates. The order is a plan, not a schedule, and content quality decides
the pace.
