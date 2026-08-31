# Manifest

Why this project exists, and the rules every file in it follows.

This is a set of mini-courses on AI Engineering. There is no shortage of AI content
on the internet, so the only thing that justifies writing more of it is being
different in a way that matters. The seven rules below are that difference. They are
not style preferences — they are the reason the material is worth reading. Every file
under `sections/` is written to obey them.

---

## 1. The content is human-written

Here we talk about state of the art. These technologies and techniques are new, so
they are not yet well established. That has consequences most people miss:

- **Many articles on the internet are wrong or misleading.** Nobody has had the time
  to be right yet.
- **LLMs are worse on these topics, not better.** Their knowledge cutoff is older
  than most of what we cover, so what they produce is AI slop.
- **Even for topics older than the cutoff, they are unreliable.** The topic is not
  well established, so the model never saw enough good, trustworthy material about it
  to give a precise answer.
- **Asking an LLM to teach you makes it worse.** Because the knowledge is not in its
  parameters, it searches the web first — and the web on these topics is imprecise,
  full of AI-slop Medium articles. The model launders weak sources into a
  confident answer.
- **Search returns the most relevant results, not the history.** A model does not know
  where and when a topic first emerged, or how it evolved over time. That history is
  often the part that makes the topic finally make sense.

So what we do instead: most of the content here is drafted by a real human AI
engineer — me. I have been working on this for years. I do not have an LLM's
limitations, and there are things in my head that simply cannot be found on the
internet, in any article, in any form. Writing those things down is my real
contribution, and it is the most valuable thing here.

If I only wanted to hand over what already exists, I would just give references to
external sources and let people go read them. Instead, I am writing original
material.

## 2. It is explained the way I would explain it to you in person

I am not writing a book, and I am not trying to make it complex. If you asked me this
question in real life — at a desk, over coffee — I would answer in my own words,
using the familiar vocabulary that AI engineers actually use with each other.

That is the register here. No effort is spent on sounding authoritative.

## 3. It is easy to read and understand

There is a line attributed to Einstein: the true genius is explaining complex things
in a simple way. So here we simplify, and sometimes we deliberately oversimplify.

The language stays plain, never advanced. No jargon, no buzzwords. It should be easy
to read even for someone who is not a native speaker of the language.

## 4. It is concise, not verbose — yet still clear

In a world where people live on TikTok and Reels, concentration is short and the
reward has to come quickly. That is the reader we are writing for: someone who will
bounce the moment the page starts to look like work.

**The success criterion: nobody should ever need to paste one of these files into
ChatGPT and ask it for a summary.** If they do, the file failed.

Most files should be readable in about 5–10 minutes. A few topics will earn an
exception.

But conciseness must never cost clarity. Do not compress a simple sentence into
something so dense and short that the reader has to decode it. Short and clear, not
short and cryptic.

## 5. Visualization, visualization, visualization!

A picture is worth a thousand words. Many of the complex topics we discuss here become
easy the moment you see them drawn — a diagram, a chart, a mind-map.

Language is just an interface for people to communicate and think, and in technical
topics it is usually poorer than an image. A meme, even a brain-rot one, carries
something through the senses that a sentence cannot.

So wherever it helps, use whatever fits:

- images from the internet
- ASCII art we draw ourselves
- mermaid diagrams
- generated images — write a prompt for that specific figure, diagram or meme and run
  it through an image model
- illustrations built in Claude web or desktop and exported
- and for exceptional cases, a draw.io diagram I make myself

## 6. Every topic is extendable, with links out

Because each topic is explained short and simple, some readers will want more. So at
the end of every file there are external links for further reading, plus references
where they are genuinely needed.

We keep things simple **on purpose**, to make people feel the need to read more. This
is a deliberate strategy: in the TikTok world of 2026, nobody can be forced to learn
anything. They have to want it themselves. Our job is to create the appetite, not to
serve the whole meal.

## 7. Only the topics that matter

There are many things that can be learned, but they do not all weigh the same in
practice or in real-life AI engineering. So we deliberately do not discuss everything
in detail — only the most important topics, and only their most important parts.

**This is a cheatsheet of AI Engineering, not a book about it.**

And that is exactly where the value is. In theory an AI can tell you a topic is
important; only a battle-tested AI engineer knows what actually matters in practice,
what is trending and what is noise. Deciding what to leave out is part of the
contribution.

---

## How we work

Process notes, not rules about content:

- **English first, Turkish at the end.** Each module is written and settled in
  English. The Turkish versions (`*_tr.md`) come afterwards, once the English is
  final — so we translate once instead of repeatedly.
- **Drafts start with the human.** I provide the explanation, the shape and any
  references in my own words; rough is fine. Turning that into clean markdown and
  proposing the visuals is the assistive part. Gaps in my draft never get filled with
  invented content — they get marked and asked about.
- **The README and the site homepage are the same page.** `README.md` (for GitHub) and
  `sections/index.md` (for the published site) always carry the same content. Change one
  and the other gets updated in the same commit — only the link paths differ, because
  `index.md` lives inside `sections/`.
- **Status.** Fundamentals (modules 1–7) are close to the target and will be improved
  in place. Intermediate (modules 8–15) will be rewritten from the beginning.
