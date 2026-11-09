import { rng } from './haystack-geometry'

/**
 * Stall 3, "The seal" (3E): a sheet on a desk in CSS 3D, written by hand with a reed pen, one line
 * crossed out and written again, then closed with a wax seal reading WRITTEN BY HUMANS · FOR HUMANS.
 * Ported from `playground/2026-11-round-5/R3-stall-humans.html`, option 3E.
 *
 * The server draws the end of the story: the page full, the crossed-out line, the seal pressed, the
 * pen lifted. That is the picture with no script and under reduced motion. The island's timeline
 * (`seal-motion.ts`) starts from an empty page and plays back to it, on a loop, while the stall is on
 * screen.
 *
 * Un-boxed (D115): the playground's slot was a lit square with a hairline; here the desk is a pool of
 * shade wider than the slot that fades into the ground, and the sheet's shadow is a soft gradient
 * under it rather than a box shadow.
 */

/** Cursive from a trochoid: each turn is one letter, a loop or a hump, sometimes tall, sometimes with a tail. */
function script(x0: number, x1: number, b: number, seed: number, hgt = 13): string {
  const R = rng(seed)
  let d = ''
  let x = x0
  while (x < x1 - 20) {
    const xe = Math.min(x + 26 + R() * 60, x1)
    let first = true
    let px = x
    while (px < xe) {
      const loop = R() < 0.45
      const tall = R() < 0.22
      const tail = !tall && R() < 0.12
      const h = hgt * (tall ? 2.1 : 1)
      const r = loop ? 6.2 : 2.2
      const a = 4.3
      for (let s = 0; s <= 2 * Math.PI + 0.01; s += 0.3) {
        const X = px + s * a + r * Math.sin(s)
        const Y = b - (h * (1 - Math.cos(s))) / 2 + (tail ? Math.sin(s / 2) * hgt * 0.9 * (s > Math.PI ? 1 : 0) : 0)
        d += `${first ? 'M' : 'L'}${X.toFixed(1)},${Y.toFixed(1)}`
        first = false
      }
      px += 2 * Math.PI * a
    }
    x = xe + 12 + R() * 8
  }
  return d
}

/** The six lines of the page, in the order they are written; the fourth is crossed out. */
export const SEAL_LINES = [
  { d: script(40, 250, 92, 3, 15), w: 3.2, dur: 0.9 },
  { d: script(40, 356, 142, 7), w: 2.2, dur: 1.0 },
  { d: script(40, 346, 192, 12), w: 2.2, dur: 1.0 },
  { d: script(40, 330, 242, 19), w: 2.2, dur: 1.0 },
  { d: script(40, 352, 292, 27), w: 2.2, dur: 1.0 },
  { d: script(40, 250, 342, 33), w: 2.2, dur: 0.8 },
] as const
const CROSS = 'M36,238 C120,230 230,244 336,232'
const PEN_INK = '#2a2656'

export function SealScene() {
  return (
    <div className="scene scene-seal" data-scene="seal">
      <div
        className="e-stage"
        role="img"
        aria-label="A page of paper on a desk, seen in perspective, written by hand in lines of script with one line crossed out, and a crimson wax seal pressed onto it that reads Written by humans, for humans."
      >
        <div className="e-desk">
          {/* data-bleed: the desk pool and the shade are wider than the slot on purpose and fade out before their edges */}
          <div className="e-table" data-bleed="" />
          <div className="e-shadow" data-bleed="" />
          <div className="e-page">
            <svg viewBox="0 0 400 520" aria-hidden="true">
              <g stroke={PEN_INK} opacity="0.07" strokeWidth="1">
                {Array.from({ length: 8 }, (_, i) => (
                  <path key={i} d={`M40,${96 + i * 50}H360`} />
                ))}
              </g>
              <g className="e-lines" fill="none" strokeLinecap="round" strokeLinejoin="round" stroke={PEN_INK}>
                {SEAL_LINES.map((line, i) => (
                  <path key={i} d={line.d} strokeWidth={line.w} />
                ))}
                <path d={CROSS} strokeWidth="3" />
              </g>
            </svg>
            <div className="e-ring" />
            <div className="e-seal">
              {[1, 3, 5, 7, 9].map((z) => (
                <div key={z} className="e-layer" style={{ transform: `translateZ(${z}px)` }} />
              ))}
              <svg viewBox="0 0 100 100" style={{ transform: 'translateZ(10px)' }} aria-hidden="true">
                <defs>
                  <path id="seal-arc" d="M50,50 m-33,0 a33,33 0 1,1 66,0 a33,33 0 1,1 -66,0" />
                </defs>
                <path
                  d="M50,4 C62,3 70,9 80,12 C90,17 95,28 96,40 C99,52 95,62 92,72 C86,84 76,92 64,95 C52,99 40,97 30,92 C18,87 9,78 6,66 C2,54 3,42 7,31 C12,18 22,9 34,6 C40,4 45,4 50,4Z"
                  fill="#b4503f"
                />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#00000033" strokeWidth="2.4" />
                <circle cx="50" cy="50" r="24" fill="none" stroke="#FFFFFF2A" strokeWidth="1.2" />
                <text fontFamily="Avenir Next, system-ui, sans-serif" fontWeight="700" fontSize="8" fill="#F3D6CC" opacity="0.9">
                  <textPath href="#seal-arc" startOffset="0" textLength="200" lengthAdjust="spacing">
                    WRITTEN BY HUMANS · FOR HUMANS ·
                  </textPath>
                </text>
                <g transform="translate(50 54)" fill="#6A2A1F">
                  <rect x="-9" y="-6" width="18" height="17" rx="7" />
                  <rect x="-9" y="-20" width="4.4" height="17" rx="2.2" />
                  <rect x="-4.2" y="-23" width="4.4" height="20" rx="2.2" />
                  <rect x=".6" y="-22" width="4.4" height="19" rx="2.2" />
                  <rect x="5.2" y="-18" width="4" height="15" rx="2" />
                  <rect x="-15" y="-6" width="4.4" height="13" rx="2.2" transform="rotate(-38 -12 4)" />
                </g>
                <path d="M22,30 C30,18 44,13 56,14" fill="none" stroke="#FFFFFF30" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </div>
            <div className="e-pen">
              <div className="e-reed" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
