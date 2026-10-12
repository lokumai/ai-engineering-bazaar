# /brag plan: AI Engineering Bazaar, the brain-rot cut

Made with `/brag` (on Opus 5.5 it runs as `/brag-slim`: the model builds the whole video itself).
Vertical 1080x1920, 30 fps, 30.0 s.

## Answers

- **What is it?** Free mini-courses on AI engineering, written by working AI engineers, that read
  in 20 to 30 minutes each, in English, Turkish and Persian.
- **Who is it for?** People learning AI engineering who are tired of hot takes, threads and
  machine-written tutorials that repeat each other.
- **What sets it apart?** Humans write it, it only covers the essentials, pictures do most of the
  work, and it is honest enough to ship a little brain rot on purpose (its own home page says so).
- **Most impressive or funniest claim:** "Written by Humans. No AI Slop." next to a course that
  admits "sometimes even a little brain rot".
- **Visual hook:** a vertical feed of AI hot takes scrolling too fast, then the brain crashes.
- **Real thing shown:** the site's own street art (the gate, three stalls, the lanterns, the pen,
  scale and picture icons), the hanging-sign look, the cobalt bar and Iznik tile band, the lokum
  logo, the onion diagram from Harness Engineering and the job-titles comic from Loop Engineering.
- **Tone:** chaotic, refined: meme-literate, self-aware, still on brand. Big type, one line at a
  time, hard cuts on the beat.
- **Share caption:** see `share-copy.txt`.

## Angle

The timeline rots your brain; the Bazaar is the cure, and it is honest that it keeps a little of
the rot because memes teach. The video opens inside the doomscroll, crashes it, walks into the
bazaar, hangs three signs, prints the receipts, and ends on "AI engineering, minus the brain rot.
(ok, a little)".

## Visual identity

- Palette from `src/design/bazaar.css`: ground `#fdfbf7`, title ink `#1b1b47`, cobalt `#282864`,
  teal `#2f8c86`, plum `#7a4a86`, ochre `#b8873b`, brick `#a0503c`, ornament `#c8a078`, sand
  `#e6dac6`.
- Type: Fraunces (the home page's display face, SOFT axis up) for every line meant to be read;
  Figtree (the nearest open face to the site's Avenir Next) for stickers, buttons and the receipt;
  Vazirmatn for فارسی.
- The tile band is the site's own `.bz-band` gradient stack, scaled 1.5x.

## Storyboard (cuts on the beat grid of the track, 0.526 s per beat)

| # | Time (s) | Scene | On screen to read |
| --- | --- | --- | --- |
| 1 | 0.00 to 3.16 | **Hook.** A feed of AI hot takes scrolls up too fast (texture). "POV:" pops, then the line lands word by word on the beat. | POV: you're learning AI from the timeline |
| 2 | 3.16 to 6.84 | **Brain rot.** The feed glitches and freezes. A brain melts. A dialog in the site's card style pops up; a cursor clicks the second button; the screen punches into the next scene. | brain.exe has stopped responding · Cause: brain rot · [keep scrolling] [read something human] |
| 3 | 6.84 to 9.99 | **Reveal.** The cobalt bar slams down with the tile band and the logo; the gate art pulls back behind the headline; lokum cubes in the five colours drop in. | AI Engineering Bazaar · AI engineering, made simple, short and useful. |
| 4 | 9.99 to 13.15 | **Sign 1.** The scribe stall; a sign swings in from its rail. A sticker slaps on the strong beat. | Written by humans. No AI slop. · no cap |
| 5 | 13.15 to 16.83 | **Sign 2.** The scale stall; the second sign swings in. | We only cover essentials. · A cheatsheet for AI engineering, not a textbook. |
| 6 | 16.83 to 19.47 | **Sign 3.** The third sign; the onion diagram and the job-titles comic land like polaroids; a sticker. | Pictures do most of the work. · memes included |
| 7 | 19.47 to 26.31 | **The receipts.** A receipt prints one line per beat; the total lands with a FREE stamp. | THE RECEIPTS · 19 modules · 20 to 30 min each · English, Türkçe, فارسی · a quiz after each module · free, no account · progress stays in your browser · TOTAL +1000 aura |
| 8 | 26.31 to 30.00 | **Outro.** Cobalt ground, lanterns swinging, logo, the punchline, the URL. | AI engineering, minus the brain rot. · (ok, a little) · lokumai.github.io/ai-engineering-bazaar |

Every number on screen is measured from the repository: 19 finished modules in
`mini-courses/curriculum.yaml`, 20 to 30 minutes per finished module, 89 quiz questions over
19 quiz files (one per finished module), 19 Persian and 33 Turkish files.

## Music cue guidance

- Track: ende.app "Happy Beats / Business Moves" vol. 9, 114 BPM (CC BY 4.0).
- The opening 18 s is a quieter build; the full groove arrives at about 19.5 s and holds until a
  breakdown at 49.5 s. The cut uses **18.44 s to 48.44 s** of the track, so the groove lands
  1.04 s into the video, on the first line of the hook.
- 0.12 s fade-in, 2.2 s fade-out. Strong cues used: 10.00 (sign 1), 11.57 (sticker), 21.05 and
  25.26 (receipt lines and total).

## SFX (Kenney, CC0, from the brag library), mixed under the music

Soft impacts on scene slams, a glitch and an error tone for the crash, a click for the cursor,
card slides for the signs and polaroids, a punch for the stickers, soft key ticks for the receipt
lines, a bell for the receipt total.

## Poster

The settled receipt at 25.8 s (every line, the total and the FREE stamp in place) is `brag.jpg`
and replaces frame 0 of `brag.mp4`, so every platform shows it as the thumbnail.
