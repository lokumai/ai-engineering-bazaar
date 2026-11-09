/**
 * Stall 5, "Nietzsche, engraved" (5A, the author's idea): an original portrait of Friedrich Nietzsche
 * inked line by line, as on an engraving plate, his gaze lifting as the light crosses his face.
 * Ported from `playground/2026-11-round-5/R5-stall-nietzsche.html`, option 5A, with its seed, so
 * every strand of hair and every hatch falls where it fell there.
 *
 * The server draws the finished plate, which is the picture with no script and under reduced motion;
 * the island (`engraving-motion.ts`) wipes it and inks it again when the stall arrives, then lets the
 * light travel across the face.
 *
 * Un-boxed (D115), and this is the one change to the art itself. The playground set the portrait on
 * a cream oval plate inside two gold rings, clipped at the oval's edge: a frame, if a round one. Here
 * the rings are gone, the cream fades out radially into the ground, and the portrait is MASKED by a
 * soft ellipse instead of clipped by a hard one, so the shoulders dissolve rather than end on a line.
 */

const INK = '#1d1b35'
const PAPER = '#f6eedf'
const GOLD_DEEP = '#c8a078'

/** The playground's generator (an LCG, not the other scenes' mulberry): it is what drew this plate. */
function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const f1 = (n: number) => n.toFixed(1)

/** The head is turned a little to the viewer's left: every feature of the face shifts by this. */
const FX = -12

interface Stroke {
  d: string
  stroke?: string
  width: number
  opacity?: number
}

interface Family {
  clip: string
  strokes: Stroke[]
}

interface Plate {
  hairFill: string
  hairOut: string
  hairIn: string
  hair: Stroke[]
  stache: Stroke[]
  brow: Stroke[]
  /** In drawing order: the face's shade and its turned features, then the neck and the chin. */
  shade: Family[]
  features: Family[]
  below: Family[]
}

function plate(): Plate {
  const R = lcg(18441015)
  const cx = 198
  const cy = 176
  const a0 = Math.PI * 1.075
  const a1 = Math.PI * 1.925
  const recede = (a: number) =>
    1 + 0.1 * Math.exp(-Math.pow((a - Math.PI * 1.27) / 0.1, 2)) + 0.1 * Math.exp(-Math.pow((a - Math.PI * 1.73) / 0.1, 2))
  const inR = (a: number): [number, number] => [64 * recede(a), 74 * recede(a)]
  const outR = (a: number): [number, number] => {
    const k = 1 + 0.025 * Math.sin(a * 11)
    return [83 * k, (116 + 8 * Math.exp(-Math.pow((a - Math.PI * 1.5) / 0.35, 2))) * k]
  }
  const P = (r: [number, number], a: number): [number, number] => [cx + r[0] * Math.cos(a), cy + r[1] * Math.sin(a)]

  let outer = ''
  let inner = ''
  for (let i = 0; i <= 48; i++) {
    const a = lerp(a0, a1, i / 48)
    const o = P(outR(a), a)
    const n = P(inR(a), a)
    outer += `${i ? ' L' : 'M'}${f1(o[0])},${f1(o[1])}`
    inner = ` L${f1(n[0])},${f1(n[1])}${inner}`
  }
  let hairIn = ''
  for (let i = 5; i <= 43; i++) {
    const a = lerp(a0, a1, i / 48)
    const n = P(inR(a), a)
    hairIn += `${i > 5 ? ' L' : 'M'}${f1(n[0])},${f1(n[1])}`
  }

  // hair: strands rising from the hairline and lying back over the crown
  const hair: Stroke[] = []
  for (let i = 0; i < 96; i++) {
    const t = i / 95
    const a = lerp(a0 + 0.03, a1 - 0.03, t) + (R() - 0.5) * 0.03
    const ri = inR(a)
    const ro = outR(a)
    const s = P([ri[0] + R() * 2, ri[1] + R() * 2], a)
    const ae = a + (t < 0.5 ? -1 : 1) * (0.06 + R() * 0.12)
    const e = P([ro[0] - 1 - R() * 5, ro[1] - 2 - R() * 7], ae)
    const mid = P([(ri[0] + ro[0]) / 2, (ri[1] + ro[1]) / 2], a)
    const lit = t < 0.55 && i % 2 === 1
    const width = lit ? 0.6 + R() * 0.5 : 0.6 + R() * 0.7
    const opacity = lit ? 0.25 + R() * 0.3 : 0.85
    hair.push({
      d: `M${f1(s[0])},${f1(s[1])} Q${f1(mid[0] + (t - 0.5) * -8)},${f1(mid[1] - 10)} ${f1(e[0])},${f1(e[1])}`,
      stroke: lit ? PAPER : INK,
      width,
      opacity,
    })
  }

  // the moustache: strands fanning from under the nose and falling over the mouth
  const stache: Stroke[] = []
  for (let i = 0; i < 72; i++) {
    const s = (i / 71) * 2 - 1
    const m = Math.abs(s)
    const x0 = 200 + s * 26 + (R() - 0.5) * 3
    const y0 = 246 + m * 3
    const x1 = 200 + s * 70 + (R() - 0.5) * 5
    const y1 = 297 + m * m * 15 + (R() - 0.5) * 3
    const qx = 200 + s * 60
    const qy = 258 + m * 4
    const lit = s < 0.15 && i % 2 === 1
    const width = lit ? 0.7 + R() * 0.4 : 0.8 + R() * 0.5
    const opacity = lit ? 0.32 + R() * 0.25 : 0.9
    stache.push({ d: `M${f1(x0)},${f1(y0)} Q${f1(qx)},${f1(qy)} ${f1(x1)},${f1(y1)}`, stroke: lit ? PAPER : INK, width, opacity })
  }

  // the brows' own hair, short strokes lying outward
  const brow: Stroke[] = []
  for (const [xa, xb, dir] of [
    [148, 195, -1],
    [251, 206, 1],
  ]) {
    for (let i = 0; i < 18; i++) {
      const t = i / 17
      const x = lerp(xb, xa, t)
      const y = 159 - Math.sin(t * Math.PI) * 7 + t * 8
      const qy = -3 - R() * 2
      const ex = dir * -10 - R() * 3 * dir
      const ey = 1 + R() * 3
      brow.push({ d: `M${f1(x)},${f1(y + 4)} q${f1(dir * -6)},${f1(qy)} ${f1(ex)},${f1(ey)}`, width: 0.9 })
    }
  }

  // hatching: parallel lines inside a clip, one family per shadow
  const family = (clip: string, ang: number, gap: number, x0: number, y0: number, x1: number, y1: number, width: number, opacity: number): Family => {
    const c = Math.cos((ang * Math.PI) / 180)
    const s = Math.sin((ang * Math.PI) / 180)
    const mx = (x0 + x1) / 2
    const my = (y0 + y1) / 2
    const L = Math.hypot(x1 - x0, y1 - y0)
    const strokes: Stroke[] = []
    for (let o = -L / 2; o <= L / 2; o += gap) {
      const px = mx - s * o
      const py = my + c * o
      const bend = (R() - 0.5) * 3
      strokes.push({
        d: `M${f1(px - (c * L) / 2)},${f1(py - (s * L) / 2)} Q${f1(px - s * bend)},${f1(py + c * bend)} ${f1(px + (c * L) / 2)},${f1(py + (s * L) / 2)}`,
        width,
        opacity,
      })
    }
    return { clip, strokes }
  }
  const shade = [family('nz-shade', 62, 3.6, 200, 120, 300, 340, 0.7, 0.75), family('nz-shade', -20, 5.2, 220, 170, 300, 330, 0.55, 0.5)]
  const features = [
    family('nz-sock', 35, 2.2, 140, 155, 260, 235, 0.65, 0.85),
    family('nz-sock', -40, 2.8, 140, 155, 260, 235, 0.55, 0.65),
    family('nz-noseR', 70, 2.6, 196, 160, 226, 246, 0.6, 0.7),
  ]
  const below = [family('nz-neck', 75, 3, 150, 320, 250, 360, 0.7, 0.7), family('nz-face', 8, 3.6, 150, 306, 250, 324, 0.5, 0.45)]

  return { hairFill: `${outer}${inner} Z`, hairOut: outer, hairIn, hair, stache, brow, shade, features, below }
}

const PLATE = plate()

function Strokes({ strokes, className }: { strokes: Stroke[]; className: string }) {
  return strokes.map((one, i) => (
    <path
      key={i}
      className={className}
      d={one.d}
      stroke={one.stroke}
      strokeWidth={+one.width.toFixed(2)}
      strokeOpacity={one.opacity === undefined ? undefined : +one.opacity.toFixed(2)}
      pathLength={1}
    />
  ))
}

function Hatch({ family }: { family: Family }) {
  return (
    <g clipPath={`url(#${family.clip})`}>
      <Strokes strokes={family.strokes} className="ht" />
    </g>
  )
}

const ft = `translate(${FX} 0)`
const STACHE =
  'M200,247 C192,242 178,241 168,246 C152,253 140,268 133,288 C129,298 127,306 130,313 C134,308 138,304 143,301 C151,297 161,297 171,299 C183,301 194,299 200,295 C206,299 217,301 229,299 C239,297 249,297 257,301 C262,304 266,308 270,313 C273,306 271,298 267,288 C260,268 248,253 232,246 C222,241 208,242 200,247'

/** Where the light's sweep rests in the still picture: 35% of its way, eased, as the playground's `still()` leaves it. */
export const LIGHT_STILL = 'translate(165 148.2) scale(215.5)'
export const LIGHT_FROM = 'translate(120 140) scale(210)'
export const LIGHT_TO = 'translate(285 170) scale(230)'

export function EngravingScene({ display }: { display: string }) {
  return (
    <div className="scene scene-engraving" data-scene="engraving">
      <svg
        viewBox="0 0 400 420"
        role="img"
        aria-label="An engraved portrait of Friedrich Nietzsche: high forehead, swept-back hair, heavy brows and the long drooping moustache."
      >
        <defs>
          <radialGradient id="nz-paper" cx="196" cy="178" r="205" gradientUnits="userSpaceOnUse" gradientTransform="translate(196 178) scale(1 1.08) translate(-196 -178)">
            <stop offset="0" stopColor={PAPER} />
            <stop offset=".36" stopColor="#efe4cf" stopOpacity=".97" />
            <stop offset=".62" stopColor="#d9c7a4" stopOpacity=".62" />
            <stop offset=".84" stopColor="#c9b48f" stopOpacity=".2" />
            <stop offset="1" stopColor="#c9b48f" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="nz-fadeg" cx="200" cy="184" r="206" gradientUnits="userSpaceOnUse">
            <stop offset=".6" stopColor="#fff" />
            <stop offset="1" stopColor="#000" />
          </radialGradient>
          <mask id="nz-fade" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="420">
            <rect width="400" height="420" fill="url(#nz-fadeg)" />
          </mask>
          <radialGradient id="nz-light" className="nz-light" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform={LIGHT_STILL}>
            <stop offset="0" stopColor={INK} stopOpacity="0" />
            <stop offset=".55" stopColor={INK} stopOpacity=".05" />
            <stop offset="1" stopColor={INK} stopOpacity=".42" />
          </radialGradient>
          <linearGradient id="nz-skin" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={INK} stopOpacity=".02" />
            <stop offset=".55" stopColor={INK} stopOpacity=".07" />
            <stop offset="1" stopColor={INK} stopOpacity=".22" />
          </linearGradient>
          <clipPath id="nz-face">
            <path
              id="nz-face-p"
              d="M141,170 C138,140 152,104 200,100 C250,104 264,140 262,170 C268,202 266,238 256,270 C248,298 230,322 202,333 C178,325 160,302 152,274 C144,246 140,208 141,170 Z"
            />
          </clipPath>
          <clipPath id="nz-stache-c">
            <path d={`${STACHE} Z`} />
          </clipPath>
          <clipPath id="nz-shade">
            <path d="M236,140 C248,172 248,228 236,264 C228,286 216,308 204,322 L204,345 L295,345 L295,120 Z" />
          </clipPath>
          <clipPath id="nz-sock">
            <ellipse cx="173" cy="175" rx="23" ry="12" />
            <ellipse cx="228" cy="175" rx="23" ry="12" />
          </clipPath>
          <clipPath id="nz-noseR">
            <path d="M205,168 C208,190 211,212 213,229 L220,236 L214,242 L206,240 C204,214 202,190 200,168 Z" />
          </clipPath>
          <clipPath id="nz-neck">
            <path d="M168,326 C180,334 222,334 234,326 L240,360 L160,360 Z" />
          </clipPath>
          <clipPath id="nz-eyeL">
            <path d="M157,180 C164,174 179,173 189,179 C181,186 166,186 159,182 Z" />
          </clipPath>
          <clipPath id="nz-eyeR">
            <path d="M211,179 C221,173 236,174 243,180 C234,186 220,186 212,181 Z" />
          </clipPath>
          <path id="nz-arc" d="M46,384 Q200,420 354,384" />
        </defs>

        <g className="nz-plate">
          <rect x="-20" y="-40" width="440" height="460" fill="url(#nz-paper)" />
        </g>

        <g mask="url(#nz-fade)">
          <g transform="translate(16 10) scale(.92)">
            <g className="nz-tones">
              <path d="M164,350 C120,356 76,372 50,420 L350,420 C324,372 280,356 236,350 L232,366 L214,386 L200,400 L186,386 L168,366 Z" fill={INK} opacity=".9" />
              <path d="M170,318 C170,332 168,344 164,352 L236,352 C232,344 230,332 230,318 Z" fill={INK} opacity=".1" />
              <use href="#nz-face-p" fill="url(#nz-skin)" />
              <path d={PLATE.hairFill} fill={INK} opacity=".76" />
              <path d="M260,184 C274,176 284,192 280,210 C277,226 268,238 256,236 Z" fill={INK} opacity=".14" />
              <path d="M164,350 L184,334 L200,354 L216,334 L236,350 L232,366 L200,373 L168,366 Z" fill={PAPER} />
              <path d="M188,357 L200,367 L212,357 L215,388 L200,400 L185,388 Z" fill={INK} />
              <g transform={ft}>
                <path d={`${STACHE} Z`} fill={INK} opacity=".86" />
                <path d="M146,168 C152,151 172,147 195,156 C196,160 195,163 193,165 C177,160 161,162 151,173 C148,173 145,171 146,168 Z" fill={INK} opacity=".92" />
                <path d="M252,168 C246,151 226,147 206,156 C205,160 206,163 208,165 C222,160 238,162 248,173 C251,173 253,171 252,168 Z" fill={INK} opacity=".92" />
                <ellipse cx="188" cy="240" rx="3.6" ry="2" fill={INK} />
                <ellipse cx="205" cy="240" rx="3" ry="1.8" fill={INK} />
                <path d="M186,305 C194,311 206,311 214,305 C208,309 192,309 186,305 Z" fill={INK} opacity=".5" />
              </g>
            </g>

            <g className="nz-hatch" fill="none" stroke={INK} strokeLinecap="round">
              <g clipPath="url(#nz-face)">
                <g transform={ft}>
                  {PLATE.features.map((family, i) => (
                    <Hatch key={i} family={family} />
                  ))}
                </g>
                {PLATE.shade.map((family, i) => (
                  <Hatch key={i} family={family} />
                ))}
              </g>
              {PLATE.below.map((family, i) => (
                <Hatch key={i} family={family} />
              ))}
            </g>

            <g className="nz-hair" fill="none" strokeLinecap="round">
              <Strokes strokes={PLATE.hair} className="hs" />
            </g>

            <g className="nz-lines" fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round">
              <path className="ln" pathLength={1} strokeWidth="1.25" d="M141,170 C140,208 144,246 152,274 C160,302 178,325 202,333 C230,322 248,298 256,270 C266,238 268,202 262,170" />
              <path className="ln" pathLength={1} strokeWidth="1.3" d="M260,184 C274,176 284,192 280,210 C277,226 268,238 256,236" />
              <path className="ln" pathLength={1} strokeWidth=".9" d="M264,194 C272,194 272,210 266,222" />
              <path className="ln" pathLength={1} strokeWidth=".8" d="M164,128 C180,123 220,123 236,128" />
              <path className="ln" pathLength={1} strokeWidth=".7" d="M168,139 C184,135 212,135 228,139" />
              <path className="ln" pathLength={1} strokeWidth=".9" d="M153,214 C155,228 157,238 160,246" />
              <path className="ln" pathLength={1} strokeWidth=".9" d="M250,212 C246,230 242,244 236,254" />
              <path className="ln" pathLength={1} strokeWidth=".9" d="M168,320 C178,327 202,329 214,320" />
              <path className="ln" pathLength={1} strokeWidth="1.2" d="M170,318 C170,332 168,344 164,352 M230,318 C230,332 232,344 236,352" />
              <path className="ln" pathLength={1} strokeWidth="1.2" d="M164,350 L184,334 L200,354 L216,334 L236,350 L232,366 L200,373 L168,366 Z" />
              <path className="ln" pathLength={1} strokeWidth="1.4" d="M164,350 C120,356 76,372 50,420 M236,350 C280,356 324,372 350,420" />
              <path
                className="ln"
                pathLength={1}
                strokeWidth="1"
                stroke={PAPER}
                strokeOpacity=".5"
                d="M168,366 L146,420 M232,366 L254,420 M120,372 C112,388 108,404 106,420 M280,372 C288,388 292,404 294,420"
              />
              <path className="ln" pathLength={1} strokeWidth="1.4" d={PLATE.hairOut} />
              <path className="ln" pathLength={1} strokeWidth="1" d={PLATE.hairIn} />
              <g transform={ft}>
                <path className="ln" pathLength={1} strokeWidth="1" d="M196,148 C195,153 195,158 196,162 M203,148 C204,153 204,158 203,162" />
                <path className="ln" pathLength={1} strokeWidth="2.6" d="M157,180 C164,174 179,173 189,179" />
                <path className="ln" pathLength={1} strokeWidth="1" d="M159,182 C167,185.5 180,185.5 188,181" />
                <path className="ln" pathLength={1} strokeWidth="2.6" d="M211,179 C221,173 236,174 243,180" />
                <path className="ln" pathLength={1} strokeWidth="1" d="M212,181 C220,185.5 233,185.5 241,182" />
                <path className="ln" pathLength={1} strokeWidth=".8" d="M161,192 C169,196 181,195 187,191" />
                <path className="ln" pathLength={1} strokeWidth=".8" d="M214,191 C220,196 232,196 240,192" />
                <path
                  className="ln"
                  pathLength={1}
                  strokeWidth="1.5"
                  d="M193,165 C191,188 186,210 181,227 C175,234 180,244 189,243 C193,246 201,246 206,243 C213,244 218,236 212,229"
                />
                <path className="ln" pathLength={1} strokeWidth=".8" d="M206,168 C208,190 210,210 212,229" />
                <path className="ln" pathLength={1} strokeWidth="1.2" d={STACHE} />
              </g>
            </g>

            <g transform={ft}>
              <g className="nz-stache" fill="none" strokeLinecap="round" clipPath="url(#nz-stache-c)">
                <Strokes strokes={PLATE.stache} className="ms" />
              </g>
            </g>
            <g transform={ft}>
              <g className="nz-brow" fill="none" stroke={INK} strokeLinecap="round">
                <Strokes strokes={PLATE.brow} className="bs" />
              </g>
            </g>
            <g transform={ft}>
              <g className="nz-eyes">
                <g clipPath="url(#nz-eyeL)">
                  <rect x="150" y="165" width="45" height="25" fill="#cfc1a6" />
                  <g className="iris" transform="translate(-1.4 -0.4)">
                    <circle cx="174" cy="180.5" r="5.6" fill={INK} />
                    <circle cx="172.3" cy="178.8" r="1.1" fill={PAPER} />
                  </g>
                </g>
                <g clipPath="url(#nz-eyeR)">
                  <rect x="206" y="165" width="45" height="25" fill="#cfc1a6" />
                  <g className="iris" transform="translate(-1.4 -0.4)">
                    <circle cx="228" cy="180.5" r="5.6" fill={INK} />
                    <circle cx="226.3" cy="178.8" r="1.1" fill={PAPER} />
                  </g>
                </g>
                <path d="M157,180 C164,174 179,173 189,179 M211,179 C221,173 236,174 243,180" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
              </g>
            </g>
          </g>
          <rect className="nz-sweep" x="0" y="0" width="400" height="420" fill="url(#nz-light)" />
        </g>
        <text className="nz-cap" fontSize="9.5" letterSpacing="2.6" fill={GOLD_DEEP} textAnchor="middle" style={{ fontFamily: display }}>
          <textPath href="#nz-arc" startOffset="50%">
            FRIEDRICH NIETZSCHE · 1844–1900
          </textPath>
        </text>
      </svg>
    </div>
  )
}
