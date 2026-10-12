---
workflow: product-launch-video
flow: automation
storyboard: no
message: "AI engineering, written by the people who build it: short, human, pictures first, and free"
destination: youtube
aspect: 1920x1080
language: en
audience: "developers and students who want to become AI engineers, tired of AI content that is guesswork"
length: 30s
angle: philosophy
---

## Intent

A 30-second promo for AI Engineering Bazaar (lokumai.github.io/ai-engineering-bazaar), a free
course of short modules on modern AI engineering. This cut sells the philosophy and the selling
points, in the site's own look: the Bazaar Street home page (Iznik tiles, lanterns, the arched
gate, hanging signs, lokum cubes), Fraunces display type, the cobalt bar on the cream ground.

The user's words: "using a design similar to AI engineering bazaar. using proper theme songs, do
not make it verbose, make it easy to read and understand. as an idea, you can mention our
philosophy and selling points". A second, separate video (made with /brag) carries the Gen Z
brain-rot and meme angle, so this one stays warm and polished, with at most a wink of humour.

## Assets

- out/ (the site's static export, served on localhost:3111) and the live site; the home page's
  street art, the hanging signs and a real module page are the material to show.
- public/lokum-logo.svg: the brand mark; close the video on it.
- ~/.claude/plugins/marketplaces/brag/skills/brag/assets/music/: the music bed, an ende.app
  "Happy Beats / Business Moves" track (CC BY 4.0, credit ende.app), vol-1 or vol-12.

## Customizations

- No narration. On-screen text only, short lines, each held long enough to read (about 0.3 s per
  word once settled).
- Music bed from a host file (no HeyGen credential on this machine).

## Notes

- Claims allowed (measured from the repo on 2026-10-12): written by working AI engineers; "Written
  by Humans. No AI Slop."; "We only cover essentials."; "A cheatsheet for AI engineering, not a
  textbook."; "Pictures do most of the work."; 19 finished modules (33 planned); 20 to 30 minutes
  each; every finished module in English, Turkish and Persian; a short quiz at the end of each
  module (89 questions); free, MIT licence; no account needed, progress stays in your browser.
  No other numbers, testimonials or claims.
- Brand voice: no em dashes; no "just", "simply", "easy"; no exclamation marks.
- Decided autonomously (the user was away): destination YouTube/landscape 16:9 (the brag cut
  takes vertical); flow automation, no storyboard pass; no voice-over; render without a preview
  gate, because the user asked for the finished video.
