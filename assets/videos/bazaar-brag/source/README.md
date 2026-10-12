# The brain-rot cut: source

Made with `/brag` (run as `/brag-slim` on Opus 5.5). The plan and storyboard are in `../brag-plan.md`.

- `video.html`: the composition, with `<!--ART:…-->` markers where the site's own street art goes.
- `timeline.js`: every frame as a pure function of time; cuts sit on the music's beat grid.
- `build.mjs`: inlines the art from `src/components/home/street/art/`, copies the logo and two course
  images, and fetches the fonts (Fraunces, Figtree, Vazirmatn) once.
- `render.mjs`: renders 900 frames in headless Chrome and pipes them into ffmpeg.
- `mix.py`: the soundtrack, the music plus Kenney SFX, normalised to about -14.5 LUFS.

To re-render, from the repository root, with Chrome, ffmpeg and the brag plugin installed:

```bash
W=/tmp/brag-work; A=~/.claude/plugins/marketplaces/brag/skills/brag/assets
node assets/videos/bazaar-brag/source/build.mjs $W
node assets/videos/bazaar-brag/source/render.mjs $W                # or --stills 4.8,18.9 for checks
python3 assets/videos/bazaar-brag/source/mix.py $W $A
ffmpeg -i $W/video-silent.mp4 -i $W/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart brag.mp4
```

Music: ende.app, "Happy Beats / Business Moves" vol. 9 (https://ende.app/en), CC BY 4.0.
Sound effects: Kenney (https://kenney.nl/), CC0. Fonts: Fraunces, Figtree and Vazirmatn, SIL OFL.
