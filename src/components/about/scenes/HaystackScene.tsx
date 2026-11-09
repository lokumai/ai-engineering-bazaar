import { HAY, NEEDLE_L, NEEDLE_WIDTH, RAMP, WIDTHS, WIDTH_ORDER, along, haystack, mix, rgba } from './haystack-geometry'

/**
 * Stall 2, "Needle in the haystack" (2A, the author's idea), as the server draws it: the still
 * picture the page shows with no script and under reduced motion. The straw above the needle has
 * already blown away, the bed is left, and the needle catches the light.
 *
 * With motion, the island draws the same stack on a canvas laid over this (`haystack-canvas.ts`),
 * from the full stack, and the scroll blows it away; this SVG is then hidden, not removed, so a
 * client navigation finds the page as React left it.
 *
 * Un-boxed (D115): no slot, no corner ticks, no background. The playground's light beam ran off the
 * square's top edge, so the scene's container fades every edge into the ground (`about.css`).
 */

const at = (n: number) => Math.round(n * 10) / 10

/** One path per width and tone, as the canvas strokes them. */
function bedPaths(): { d: string; wi: number; ci: number }[] {
  const { keep } = haystack()
  const out: { d: string; wi: number; ci: number }[] = []
  for (const wi of WIDTH_ORDER) {
    for (let ci = 0; ci < RAMP.length; ci++) {
      let d = ''
      for (const s of keep) {
        if (s.ci !== ci || s.wi !== wi) continue
        const dx = (Math.cos(s.ang) * s.len) / 2
        const dy = (Math.sin(s.ang) * s.len) / 2
        d += `M${at(s.x - dx)} ${at(s.y - dy)}L${at(s.x + dx)} ${at(s.y + dy)}`
      }
      if (d) out.push({ d, wi, ci })
    }
  }
  return out
}

const pt = (s: number, o: number) => along(s, o).map(at).join(' ')

/** The needle's body, as the playground's `needle()` traces it. */
function needleBody(): string {
  const w = NEEDLE_WIDTH
  const L = NEEDLE_L
  return [
    `M${pt(0, w)}`,
    `L${pt(L * 0.8, w * 0.74)}`,
    `Q${pt(L * 0.95, w * 0.3)} ${pt(L, 0)}`,
    `Q${pt(L * 0.95, -w * 0.3)} ${pt(L * 0.8, -w * 0.74)}`,
    `L${pt(0, -w)}`,
    `Q${pt(-w * 1.2, 0)} ${pt(0, w)}Z`,
  ].join('')
}

/** A four-pointed glint, centred on the origin. */
function glint(size: number): string {
  const ray = (angle: number, l: number, w: number) => {
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    const p = (x: number, y: number) => `${at(x * c - y * s)} ${at(x * s + y * c)}`
    return `M${p(-l, 0)}L${p(0, -w)}L${p(l, 0)}L${p(0, w)}Z`
  }
  return [ray(0, size, 2.4), ray(Math.PI / 2, size * 0.62, 2), ray(Math.PI / 4, size * 0.3, 1.4), ray(-Math.PI / 4, size * 0.3, 1.4)].join('')
}

export function HaystackScene() {
  const [eyeX, eyeY] = along(18, 0)
  const [g1x, g1y] = along(NEEDLE_L * 0.4, NEEDLE_WIDTH + 1)
  const [g2x, g2y] = along(NEEDLE_L * 0.4, -NEEDLE_WIDTH - 1)
  const [mx, my] = along(NEEDLE_L * 0.5, 0)
  const [sx, sy] = along(NEEDLE_L * 0.86, 0)
  return (
    <div className="scene scene-haystack" data-scene="haystack">
      <svg
        className="scene-still"
        viewBox="0 0 1000 1000"
        role="img"
        aria-label="A haystack under a beam of light. The straw has blown away from its top, and a single needle, threaded with red, lies on what is left and catches the light."
      >
        <defs>
          <radialGradient id="hay-glow" cx="510" cy="610" r="470" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={HAY.gold} stopOpacity="0.22" />
            <stop offset="1" stopColor={HAY.gold} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hay-beam" x1="240" y1="0" x2="560" y2="740" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={HAY.sand} stopOpacity="0.15" />
            <stop offset="1" stopColor={HAY.sand} stopOpacity="0" />
          </linearGradient>
          <radialGradient id="hay-shadow" cx="500" cy="806" r="480" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 685) scale(1 0.15)">
            <stop offset="0" stopColor="#000" stopOpacity="0.6" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hay-steel" x1={g1x} y1={g1y} x2={g2x} y2={g2y} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#454c60" />
            <stop offset="0.3" stopColor={HAY.steel} />
            <stop offset="0.46" stopColor="#ffffff" />
            <stop offset="0.62" stopColor={mix(HAY.steel, '#000000', 0.3)} />
            <stop offset="1" stopColor="#353b4d" />
          </linearGradient>
          <radialGradient id="hay-sheen" cx={mx} cy={my} r="280" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={HAY.steel} stopOpacity="0.13" />
            <stop offset="1" stopColor={HAY.steel} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hay-star" cx="0" cy="0" r="60" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1000" height="1000" fill="url(#hay-glow)" />
        <path d="M130 -10L360 -10L730 700L380 750Z" fill="url(#hay-beam)" />
        <rect x="0" y="700" width="1000" height="220" fill="url(#hay-shadow)" />
        <g fill="none" strokeLinecap="round">
          {bedPaths().map(({ d, wi, ci }) => (
            <path key={`${wi}-${ci}`} d={d} stroke={RAMP[ci]} strokeWidth={WIDTHS[wi]} />
          ))}
        </g>
        <g strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path
            d={`M${at(eyeX)} ${at(eyeY)}C290 612 232 600 214 642C196 684 262 708 236 748C214 782 160 772 130 808`}
            stroke={HAY.crimson}
            strokeWidth="4.8"
          />
          <path
            d={`M${at(eyeX)} ${at(eyeY)}C290 612 232 600 214 642C196 684 262 708 236 748C214 782 160 772 130 808`}
            stroke={HAY.rose}
            strokeWidth="2.2"
          />
          <path d={needleBody()} fill="url(#hay-steel)" stroke="rgba(8,8,20,.55)" strokeWidth="0.8" />
          <path d={`M${pt(9, 0)}L${pt(27, 0)}`} stroke="rgba(14,13,32,.95)" strokeWidth="3.4" />
          <path d={`M${pt(18, 0)}C${pt(26, -12)} ${pt(44, -22)} ${pt(64, -18)}`} stroke={HAY.rose} strokeWidth="2.2" />
          <path d={`M${pt(32, NEEDLE_WIDTH * 0.42)}L${pt(NEEDLE_L * 0.9, NEEDLE_WIDTH * 0.14)}`} stroke="rgba(255,255,255,.55)" strokeWidth="1" />
        </g>
        <rect x={at(mx - 300)} y={at(my - 300)} width="600" height="600" fill="url(#hay-sheen)" style={{ mixBlendMode: 'screen' }} />
        <g transform={`translate(${at(sx)} ${at(sy)}) rotate(-16)`} style={{ mixBlendMode: 'screen' }}>
          <rect x="-70" y="-70" width="140" height="140" fill="url(#hay-star)" />
          <path d={glint(96)} fill={rgba('#fffcf0', 0.9)} />
        </g>
      </svg>
    </div>
  )
}
