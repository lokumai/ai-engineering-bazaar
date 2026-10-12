# Videos

Two 30-second promos for AI Engineering Bazaar, each made with a different tool and each with a
different job.

| Video | Made with | Format | What it says |
| --- | --- | --- | --- |
| [`bazaar-hyperframes/renders/video.mp4`](bazaar-hyperframes/renders/video.mp4) | [HyperFrames](https://github.com/heygen-com/hyperframes), its product-launch workflow | 1920x1080, landscape | The philosophy and the selling points, in the site's own look: a walk down the real Bazaar Street past its three signs, then the modules, the three languages, and the address |
| [`bazaar-brag/brag.mp4`](bazaar-brag/brag.mp4) | [/brag](https://github.com/latent-spaces/brag) (on Opus 5.5 it runs as /brag-slim) | 1080x1920, vertical | The Gen Z cut: the doomscroll, a brain that stops responding, then the bazaar, the receipts, and "AI engineering, minus the brain rot" |

Every number on screen was measured from the repository on 2026-10-12: 19 finished modules, 20 to
30 minutes each, every finished module in English, Turkish and Persian, a quiz at the end of each.
If those change, the videos are out of date.

## Re-rendering

- **HyperFrames**: `bazaar-hyperframes/` is a HyperFrames project (`BRIEF.md`, `STORYBOARD.md`,
  `frame.md`, `compositions/frames/`). The street footage and the module plates are recorded from
  the site's own static export by `scripts/record-walk.mjs` and `scripts/record-plates.mjs` (each
  file says how), then `npx hyperframes render --quality high --output renders/video.mp4` from that
  folder. The capture and the 15 MB footage are not committed; the scripts rebuild them.
- **/brag**: `bazaar-brag/source/README.md` has the four commands.

## Credits

- Music: [ende.app](https://ende.app/en), "Happy Beats / Business Moves" vol. 12 (HyperFrames cut)
  and vol. 9 (/brag cut), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
  Credit ende.app wherever either video is posted.
- Sound effects in the /brag cut: [Kenney](https://kenney.nl/), CC0.
- Fonts: Fraunces, Nunito Sans, Figtree and Vazirmatn, SIL Open Font License.
- The street, the signs, the logo and the module pages are the site's own.
