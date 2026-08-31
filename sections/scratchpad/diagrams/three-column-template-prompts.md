# Three-column diagram — fill-in prompts

Paste both templates with the prompt every time:

- `assets/empty-context-template.jpeg` — the layout
- `assets/context-style-template.jpeg` — the style sheet

Prompt C needs only the style sheet.

## Palette (from the style sheet)

| Box | Hex | Outline |
| --- | --- | --- |
| System Prompt | `#7B7B7B` grey | solid |
| Human Message | `#C0392B` brick red | solid |
| AI Message – thinking | `#3E8E63` green | dashed |
| AI Message – answer | `#1B6E52` deep green | solid, thicker |
| Tool Call | `#A87FE0` light purple | solid |
| Tool Result | `#6A2CA0` dark purple | solid |
| Context container | `#2A6EB5` blue | solid |
| LLM | `#D4691E` orange | solid |
| User | `#6E6E6E` grey | solid |

Only message boxes are filled. The User box, the blue Context container and the LLM box stay
outline only.

Arrows always come from the USER box or the LLM box and end on one message box.

---

## Prompt A — LLM context

> Two images are attached: an empty three-column diagram, and a style sheet of message boxes.
>
> Reproduce the empty three-column diagram exactly — same cream background and texture,
> canvas, three columns, dashed dividers, handwritten headings, grey User box with stick
> figure, blue Context container, orange LLM box with brain doodle, same hand-drawn
> double-stroke line quality.
>
> Fill the five slots inside the CONTEXT container with these boxes, top to bottom, drawn in
> the style of the style sheet, each labelled inside itself in its own outline color:
>
> 1. "System Prompt" — grey (#7B7B7B)
> 2. "Human Message" — brick red (#C0392B)
> 3. "AI Message" — deep green (#1B6E52), thicker
> 4. "Human Message" — brick red (#C0392B)
> 5. "AI Message" — deep green (#1B6E52), thicker
>
> Give each message box a light uneven hand-scribbled fill in its own color, strongest on the
> System Prompt box. The User box, the blue Context container and the LLM box stay outline
> only.
>
> Draw four thin solid hand-drawn black arrows, each with a small circled number beside it:
>
> 1. USER box → box 2 "Human Message"
> 2. LLM box → box 3 "AI Message"
> 3. USER box → box 4 "Human Message"
> 4. LLM box → box 5 "AI Message"

---

## Prompt B — Agent context

> Two images are attached: an empty three-column diagram, and a style sheet of message boxes.
>
> Reproduce the empty three-column diagram exactly — same cream background and texture,
> canvas, three columns, dashed dividers, handwritten headings, grey User box with stick
> figure, blue Context container, orange LLM box with brain doodle, same hand-drawn
> double-stroke line quality.
>
> The CONTEXT container holds six boxes instead of five slots, top to bottom, drawn in the
> style of the style sheet, each labelled inside itself in its own outline color:
>
> 1. "System Prompt" — grey (#7B7B7B)
> 2. "Human Message" — brick red (#C0392B)
> 3. "AI Message – thinking" — green (#3E8E63), dashed outline
> 4. "Tool Call" — light purple (#A87FE0)
> 5. "Tool Result" — dark purple (#6A2CA0)
> 6. "AI Message – answer" — deep green (#1B6E52), thicker
>
> Give each message box a light uneven hand-scribbled fill in its own color, strongest on the
> System Prompt box. The User box, the blue Context container and the LLM box stay outline
> only.
>
> Draw five thin solid hand-drawn black arrows, each with a small circled number beside it:
>
> 1. USER box → box 2 "Human Message"
> 2. LLM box → box 3 "AI Message – thinking"
> 3. LLM box → box 4 "Tool Call"
> 4. box 4 "Tool Call" → box 5 "Tool Result", a short arrow straight down inside the blue
>    container, labelled "host runs the tool" in small handwritten black
> 5. LLM box → box 6 "AI Message – answer"

---

## Prompt C — inside the system prompt

Replaces `1_fundamentals/images/context-window.png`. Tool Schemas reuse the Tool Call purple
so the reader meets the same color where tools are declared and where they are called.

> A style sheet of hand-drawn message boxes is attached. Match its style exactly — warm cream
> paper background with faint texture, loose hand-drawn double-stroke lines, outline-only
> shapes, handwritten labels. Landscape 4:3.
>
> Draw one large rounded rectangle filling most of the canvas, outlined in grey (#7B7B7B),
> with a light uneven hand-scribbled grey fill. Above it write "System Prompt" in large
> handwritten black.
>
> Inside it, stack three rounded boxes with space between them:
>
> 1. Grey (#7B7B7B), labelled "Instructions" in grey at its top left, and below the label two
>    short lines of smaller black handwriting: "You are a helpful assistant" and "Always
>    answer in English".
> 2. Light purple (#A87FE0), labelled "Tool Schemas" in light purple at its top left, and
>    below the label two short lines in a smaller monospace-looking black hand:
>    "get_weather(city)" and "read_file(path)".
> 3. Dashed grey outline, labelled "Knowledge (optional)" in grey at its top left, and below
>    the label one short line of smaller black handwriting: "static reference text".
>
> Give the large grey System Prompt rectangle and the first two inner boxes a light uneven
> hand-scribbled fill in their own color. The miniature blue Context container stays outline
> only.
>
> Bottom right corner, small: a miniature tall rounded rectangle outlined in blue (#2A6EB5)
> labelled "Context" in small handwritten blue, with a small grey box at the very top of it.
> Draw a thin curved hand-drawn arrow from the large grey container to that small grey box.

---

## Prompt D — next-word prediction

> Two images are attached: an empty three-column diagram, and a style sheet of message boxes.
>
> Reproduce the empty three-column diagram exactly — same cream background and texture,
> canvas, three columns, dashed dividers, handwritten headings, grey User box with stick
> figure, blue Context container, orange LLM box with brain doodle, same hand-drawn
> double-stroke line quality.
>
> The CONTEXT container holds two boxes instead of five slots. Make the blue container shorter
> so they sit in the middle of it:
>
> 1. "Human Message" — brick red (#C0392B), with "Human Message" small in brick red at its
>    top left and below it, in larger black handwriting, the exact text: "The capital of
>    Turkey"
> 2. "AI Message" — deep green (#1B6E52), thicker, with "AI Message" small in deep green at
>    its top left and below it, in larger black handwriting, the exact text: "is Ankara"
>
> Give both message boxes a light uneven hand-scribbled fill in their own color. The User box,
> the blue Context container and the LLM box stay outline only.
>
> Draw two thin solid hand-drawn black arrows, each with a small circled number beside it:
>
> 1. USER box → "Human Message" box
> 2. LLM box → "AI Message" box

---

## Variants from the same base

Keep the layout untouched, change only the centre stack:

- **Prompt engineering** — enlarge the Human Message box, System Prompt above it.
- **RAG** — a "Retrieved Chunks" box between Human Message and the LLM.
- **Memory** — two containers: short-term inside the window, long-term store outside it.
- **Context engineering** — the stack overflowing the container, oldest boxes crossed out.
- **Harness engineering** — a fourth column on the right for the host: sandbox, hooks, tool runner.

Note: in Prompt B the Tool Result is really written by the host machine, not by the Tool Call.
A small laptop icon under the LLM box would fix that if you ever want it.

## Where finished images go

`assets/` is outside `docs_dir`, so those are source templates only. Finished diagrams go in
`sections/<category>/images/`.
