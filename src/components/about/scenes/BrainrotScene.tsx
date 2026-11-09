import { rng } from './haystack-geometry'

/**
 * Stall 4, "Brainrot" (4E): a phone scrolls through three of the course's memes; a young reader in a
 * hoodie laughs at each, and Bit, the robot in the fez, reads the same phone, tilts its head and
 * reports that it finds nothing there. Ported from `playground/2026-11-round-5/R4-stall-love.html`,
 * option 4E, where it was built by script; here the server writes the same drawing as markup.
 *
 * The markup is the playground's still frame (its `still` at 3.6 s): the first meme up, the AI's
 * answer unrolled out of the phone, the reader mid-laugh, Bit's head tilted over "parsing joke... 0%".
 * The island's timeline (`brainrot-motion.ts`) resets every part to the start and plays the loop
 * while the stall is on screen. Parts it moves are named by `data-b`.
 *
 * Un-boxed (D115): the playground's slot was a lit square with a hairline, and the two figures were
 * cut off by its bottom edge. Here there is no square, and the scene fades out at the bottom
 * (`about.css`), so the reader and Bit stand in the ground instead of being sliced by a frame.
 */

const INK = '#2A2740'
const ROSE = '#E28FA1'
const GOLD_LIFT = '#E4C291'
const SAND = '#E6DAC6'
const TEAL_LIFT = '#8FE3DA'
const GOLD = '#C8A078'

const heartD = (s = 1) =>
  `M0 ${10 * s}C${-4 * s} ${6 * s} ${-12 * s} ${1 * s} ${-12 * s} ${-5 * s}C${-12 * s} ${-10 * s} ${-6 * s} ${-13 * s} 0 ${-7 * s}C${6 * s} ${-13 * s} ${12 * s} ${-10 * s} ${12 * s} ${-5 * s}C${12 * s} ${1 * s} ${4 * s} ${6 * s} 0 ${10 * s}Z`
const SPARK = 'M0 -9C1 -2 2 -1 9 0C2 1 1 2 0 9C-1 2 -2 1 -9 0C-2 -1 -1 -2 0 -9Z'
const SPIRAL = 'M0 0a2 2 0 0 1 4 0a5 5 0 0 1 -9 1a8 8 0 0 1 14 -3a11 11 0 0 1 -18 7'

/** The doodles only the human side gets. */
const DOODLES: ReadonlyArray<readonly [number, number, 'spark' | 'spiral' | 'heart' | 'lol', string]> = [
  [60, 330, 'spark', GOLD_LIFT],
  [222, 350, 'spark', ROSE],
  [40, 420, 'spiral', SAND],
  [250, 430, 'heart', ROSE],
  [56, 276, 'lol', GOLD_LIFT],
  [30, 210, 'spark', ROSE],
  [22, 532, 'spiral', GOLD_LIFT],
]

/** The lines of the AI's answer, drawn once from a seed so every load writes the same scroll. */
const SCROLL_LINES = (() => {
  const R = rng(2)
  const out: { y: number; w: number }[] = []
  for (let y = 324; y < 580; y += 9) {
    if (y === 441 || y === 450) continue
    out.push({ y, w: 40 + R() * 16 })
  }
  return out
})()

export function BrainrotScene({ hand, display }: { hand: string; display: string }) {
  const caption = { fontFamily: display }
  const cap = (lines: readonly string[], y0: number, size = 17) =>
    lines.map((line, i) => (
      <text
        key={line}
        x={105}
        y={y0 + i * 21}
        textAnchor="middle"
        fontWeight={800}
        fontSize={size}
        fill="#fff"
        stroke="#161423"
        strokeWidth={2.6}
        strokeLinejoin="round"
        paintOrder="stroke"
        letterSpacing=".03em"
        style={caption}
      >
        {line}
      </text>
    ))

  const SK = '#C98F62'
  const SKS = '#AA7448'
  const OL = '#5A3A28'
  const HAIR = '#231815'
  const STEEL = '#AEB2C8'
  const STEEL_D = '#8E8A9E'
  const IRON = '#25233F'
  const GLOW = '#8FE3DA'

  return (
    <div className="scene scene-brainrot" data-scene="brainrot">
      <svg
        viewBox="0 0 600 600"
        role="img"
        aria-label="A phone shows a meme; a young reader in a hoodie laughs, while Bit the robot tilts its head and reports that it cannot find the joke."
      >
        <defs>
          <radialGradient id="b-warm" cx="25%" cy="76%" r="45%">
            <stop offset="0" stopColor={ROSE} stopOpacity=".22" />
            <stop offset=".6" stopColor={GOLD} stopOpacity=".06" />
            <stop offset="1" stopColor={GOLD} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="b-cool" cx="75%" cy="76%" r="42%">
            <stop offset="0" stopColor={TEAL_LIFT} stopOpacity=".13" />
            <stop offset="1" stopColor={TEAL_LIFT} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="b-phone" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor={GOLD_LIFT} stopOpacity=".22" />
            <stop offset="1" stopColor={GOLD_LIFT} stopOpacity="0" />
          </radialGradient>
          <clipPath id="b-screen">
            <rect x="0" y="0" width="210" height="246" rx="10" />
          </clipPath>
          <clipPath id="b-scroll">
            <rect data-b="scrollclip" x="258" y="300" width="84" height="290" />
          </clipPath>
          <filter id="b-glow" x="-50%" y="-100%" width="200%" height="300%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width="600" height="600" fill="url(#b-warm)" />
        <rect width="600" height="600" fill="url(#b-cool)" />
        <ellipse cx="300" cy="190" rx="200" ry="180" fill="url(#b-phone)" />

        <g opacity=".75">
          {DOODLES.map(([x, y, kind, colour]) => (
            <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
              <g data-b="doodle">
                {kind === 'spark' && <path d={SPARK} fill={colour} />}
                {kind === 'heart' && <path d={heartD(0.8)} fill={colour} />}
                {kind === 'spiral' && <path d={SPIRAL} fill="none" stroke={colour} strokeWidth="1.8" strokeLinecap="round" />}
                {kind === 'lol' && (
                  <text fontSize="24" fontWeight="700" fill={colour} textAnchor="middle" transform="rotate(-12)" style={{ fontFamily: hand }}>
                    lol
                  </text>
                )}
              </g>
            </g>
          ))}
        </g>

        {/* the phone and its feed */}
        <rect x="181" y="44" width="238" height="282" rx="26" fill="#18192E" stroke="rgba(230,218,198,.4)" strokeWidth="1.5" />
        <rect x="186" y="49" width="228" height="272" rx="22" fill="none" stroke="rgba(0,0,0,.5)" strokeWidth="2" />
        <rect x="276" y="53" width="48" height="8" rx="4" fill="#0B0C1A" />
        <g transform="translate(195 66)">
          <rect width="210" height="246" rx="10" fill="#F4EBDC" />
          <g clipPath="url(#b-screen)">
            {/* meme 1: one quick question, and the answer that never ends */}
            <g data-b="m1">
              <rect width="210" height="246" fill="#EDE3D1" />
              {cap(['ME: ONE QUICK', 'QUESTION'], 30)}
              <circle cx="92" cy="122" r="20" fill="#F2CE9A" stroke={INK} strokeWidth="2.2" />
              <path d="M84 118h.1M100 118h.1" stroke={INK} strokeWidth="4" strokeLinecap="round" />
              <path d="M86 130q6 4 12 0" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
              <path d="M70 168q22 -26 44 0" fill="#7A4A86" stroke={INK} strokeWidth="2.2" />
              <path d="M122 92a18 15 0 1 1 6 26l-8 6l1 -9a18 15 0 0 1 1 -23Z" fill="#fff" stroke={INK} strokeWidth="2" />
              <text x="135" y="113" textAnchor="middle" fontSize="26" fontWeight="700" fill={INK} style={{ fontFamily: hand }}>
                ?
              </text>
              {cap(['THE AI:'], 206)}
            </g>
            {/* meme 2: attention is all you need */}
            <g data-b="m2" transform="translate(0 246)">
              <rect width="210" height="246" fill="#E4EFEC" />
              {cap(['ATTENTION IS', 'ALL YOU NEED'], 30)}
              {cap(['MY ATTENTION SPAN:'], 86, 14)}
              <path d="M66 120A44 44 0 1 0 144 120" fill="rgba(63,163,156,.22)" stroke={INK} strokeWidth="2.2" />
              <path d="M63 128Q105 122 147 128" fill="none" stroke="#3FA39C" strokeWidth="1.6" />
              <path d="M62 116Q105 112 148 116" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
              <g data-b="fish" transform="translate(105 160)">
                <g data-b="fishin">
                  <path d="M14 0C10 -12 -10 -12 -16 0C-10 12 10 12 14 0Z" fill="#E0A45C" stroke="#8A5A2A" strokeWidth="1.6" />
                  <path d="M-15 0L-28 -10L-25 0L-28 10Z" fill="#D98E4A" stroke="#8A5A2A" strokeWidth="1.4" strokeLinejoin="round" />
                  <circle cx="7" cy="-3" r="2.4" fill={INK} />
                  <path d="M-2 -9q4 5 0 10" fill="none" stroke="#8A5A2A" strokeWidth="1" />
                </g>
              </g>
              {[0, 1, 2].map((i) => (
                <circle key={i} data-b="bub" cx="122" cy="150" r={2.2 + i * 0.6} fill="none" stroke="#3FA39C" strokeWidth="1.2" />
              ))}
            </g>
            {/* meme 3: the diagram finally clicks */}
            <g data-b="m3" transform="translate(0 246)">
              <rect width="210" height="246" fill="#EAE4F2" />
              {cap(['WHEN THE DIAGRAM', 'FINALLY CLICKS'], 30)}
              <circle cx="105" cy="138" r="40" fill="#F2CE9A" stroke={INK} strokeWidth="2.2" />
              <path d="M86 156Q105 172 124 156" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
              <path d="M80 112q8 -8 16 -2M114 110q8 -6 16 2" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
              <g data-b="glasses" transform="translate(0 -120)">
                {[
                  [68, 124, 74, 6],
                  [74, 130, 28, 12],
                  [78, 142, 20, 5],
                  [108, 130, 28, 12],
                  [112, 142, 20, 5],
                ].map(([x, y, w, h]) => (
                  <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} fill="#141221" />
                ))}
                <rect x="79" y="132" width="5" height="5" fill="#fff" />
                <rect x="113" y="132" width="5" height="5" fill="#fff" />
              </g>
              <g data-b="aura" transform="translate(105 208) scale(0) translate(-105 -208)">
                {cap(['AURA +1000'], 214)}
              </g>
            </g>
          </g>
        </g>

        {/* the scroll the AI's answer unrolls out of the phone */}
        <g data-b="scroll">
          <g clipPath="url(#b-scroll)">
            <rect x="266" y="296" width="68" height="290" fill="#F1E6D2" stroke="#B8A88C" strokeWidth="1.2" />
            <text x="272" y="314" fontSize="10.5" fontStyle="italic" fill={INK} style={{ fontFamily: display }}>
              Certainly.
            </text>
            {SCROLL_LINES.map(({ y, w }) => (
              <rect key={y} x="272" y={y} width={w} height="3" rx="1.5" fill="#9A8D78" />
            ))}
            <text x="300" y="452" textAnchor="middle" fontSize="9" fill="#7A4A86" style={{ fontFamily: display }}>
              part 1 of 40
            </text>
          </g>
          <rect data-b="roll" x="260" y="294" width="80" height="14" rx="7" fill="#E2D4BA" stroke="#8F8169" strokeWidth="1.2" transform="translate(0 282)" />
        </g>

        {/* the reader */}
        <g>
          <g data-b="human">
            <path d="M44 600C46 540 78 508 150 502C222 508 254 540 256 600Z" fill="#2F8C86" stroke="#1D5753" strokeWidth="2" />
            <path d="M98 512C108 486 192 486 202 512C188 528 112 528 98 512Z" fill="#24706B" stroke="#1D5753" strokeWidth="1.5" />
            <path d="M136 482L136 508Q150 516 164 508L164 482Z" fill={SKS} />
            <path d="M140 522L136 566M160 522L164 566" stroke="#F2EADB" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M100 590Q150 576 200 590" fill="none" stroke="#1D5753" strokeWidth="1.6" opacity=".7" />
            <g>
              <ellipse cx="104" cy="452" rx="7.5" ry="10" fill={SK} stroke={OL} strokeWidth="1.8" />
              <ellipse cx="196" cy="452" rx="7.5" ry="10" fill={SK} stroke={OL} strokeWidth="1.8" />
              <circle cx="150" cy="448" r="46" fill={SK} stroke={OL} strokeWidth="2" />
              {Array.from({ length: 11 }, (_, i) => {
                const a = Math.PI * (1.08 + i * 0.084)
                return <circle key={i} cx={+(150 + Math.cos(a) * 41).toFixed(2)} cy={+(440 + Math.sin(a) * 40).toFixed(2)} r="14" fill={HAIR} />
              })}
              <circle cx="150" cy="404" r="22" fill={HAIR} />
              <circle cx="128" cy="410" r="17" fill={HAIR} />
              <circle cx="172" cy="410" r="17" fill={HAIR} />
              <ellipse data-b="cheek" cx="122" cy="464" rx="9" ry="6" fill={ROSE} opacity=".55" transform="translate(122 464) scale(1.35) translate(-122 -464)" />
              <ellipse data-b="cheek" cx="178" cy="464" rx="9" ry="6" fill={ROSE} opacity=".55" transform="translate(178 464) scale(1.35) translate(-178 -464)" />
              <g data-b="eyes" opacity="0">
                <ellipse cx="134" cy="444" rx="4.4" ry="5.4" fill={HAIR} />
                <circle cx="135.4" cy="442" r="1.4" fill="#fff" />
                <ellipse cx="166" cy="444" rx="4.4" ry="5.4" fill={HAIR} />
                <circle cx="167.4" cy="442" r="1.4" fill="#fff" />
              </g>
              <path data-b="eyeslaugh" d="M125 447Q134 436 143 447M157 447Q166 436 175 447" fill="none" stroke={HAIR} strokeWidth="3.2" strokeLinecap="round" />
              <path data-b="brows" d="M125 431Q134 425 143 430M157 430Q166 425 175 431" fill="none" stroke={HAIR} strokeWidth="3" strokeLinecap="round" transform="translate(0 -4)" />
              <path d="M150 450Q145 460 152 462" fill="none" stroke="#8F5A3A" strokeWidth="2" strokeLinecap="round" />
              <path data-b="mouth" d="M139 472Q150 479 161 472" fill="none" stroke="#7A2F36" strokeWidth="2.6" strokeLinecap="round" opacity="0" />
              <g data-b="mouthlaugh">
                <path d="M131 466Q150 469 169 466Q167 495 150 496Q133 495 131 466Z" fill="#4A1A26" stroke="#5A2A20" strokeWidth="1.5" />
                <path d="M134 467Q150 470 166 467L165 473Q150 476 135 473Z" fill="#fff" />
                <ellipse cx="150" cy="488" rx="9" ry="5" fill={ROSE} />
              </g>
              <path data-b="tear" d="M116 446Q110 456 116 460Q122 456 116 446Z" fill={TEAL_LIFT} />
            </g>
          </g>
        </g>
        {['ha', 'ha', 'HA'].map((word, k) => (
          <text
            key={k}
            data-b="ha"
            x="166"
            y="408"
            fontSize={26 + k * 5}
            fontWeight="700"
            fill={ROSE}
            opacity={k === 2 ? 0.35 : 0}
            transform={k === 2 ? 'translate(-46 -108)' : undefined}
            style={{ fontFamily: hand }}
          >
            {word}
          </text>
        ))}

        {/* Bit, the robot in the fez */}
        <g>
          <path d="M356 600C358 556 388 534 450 530C512 534 542 556 544 600Z" fill={STEEL} stroke="#6E737F" strokeWidth="2" />
          <path d="M400 548L500 600L476 600L392 556Z" fill="#2F8C86" />
          <rect x="418" y="560" width="64" height="30" rx="6" fill={IRON} />
          <circle cx="434" cy="575" r="4" fill="#A0503C" />
          <circle cx="450" cy="575" r="4" fill="#B8873B" />
          <circle cx="466" cy="575" r="4" fill="#2F8C86" />
          <rect x="434" y="494" width="32" height="40" rx="4" fill={STEEL_D} />
          <path d="M438 506h24M438 516h24M438 526h24" stroke="#00000030" strokeWidth="3" strokeLinecap="round" />
          <g data-b="head" transform="rotate(9 450 500)">
            <rect x="378" y="432" width="16" height="38" rx="6" fill="#B8873B" />
            <rect x="506" y="432" width="16" height="38" rx="6" fill="#B8873B" />
            <rect x="388" y="398" width="124" height="104" rx="26" fill={STEEL} stroke="#6E737F" strokeWidth="2" />
            <rect x="388" y="466" width="124" height="36" rx="22" fill="#00000012" />
            <rect x="402" y="412" width="96" height="72" rx="16" fill={IRON} />
            <g filter="url(#b-glow)">
              <rect x="420" y="440" width="20" height="5" rx="2.5" fill={GLOW} />
              <rect x="460" y="440" width="20" height="5" rx="2.5" fill={GLOW} />
            </g>
            <rect data-b="rmouth" x="436" y="464" width="28" height="3.6" rx="1.8" fill={GLOW} filter="url(#b-glow)" opacity="0" />
            {[436, 450, 464].map((x) => (
              <circle key={x} data-b="dot" cx={x} cy="466" r="2.8" fill={GLOW} opacity="0" />
            ))}
            <path d="M414 402L422 358Q450 352 478 358L486 402Q450 409 414 402Z" fill="#A0503C" stroke="#7A3A2C" strokeWidth="1.6" />
            <ellipse cx="450" cy="357" rx="28" ry="6" fill="#B9694F" />
            <path d="M476 360Q494 370 492 394" fill="none" stroke={IRON} strokeWidth="2.2" />
            <path d="M488 392l4 14l4 -14Z" fill={IRON} />
          </g>
        </g>
        <text data-b="qm" x="528" y="396" fontSize="44" fontWeight="700" fill={GLOW} style={{ fontFamily: display }}>
          ?
        </text>
        <g data-b="bubble">
          <rect x="422" y="312" width="166" height="42" rx="10" fill="#14153A" stroke="rgba(143,227,218,.5)" strokeWidth="1.2" />
          <path d="M446 354L458 354L448 368Z" fill="#14153A" stroke="rgba(143,227,218,.5)" strokeWidth="1.2" strokeLinejoin="round" />
          <rect x="447" y="350" width="10" height="5" fill="#14153A" />
          <text data-b="btext" x="436" y="338" fontFamily="ui-monospace, SF Mono, Menlo, Consolas, monospace" fontSize="12.5" fill={GLOW}>
            parsing joke... 0%
          </text>
        </g>
      </svg>
    </div>
  )
}

/** What Bit types under each meme, in feed order. */
export const BIT_READS = ['parsing joke... 0%', 'humour.exe not found', 'aura: undefined'] as const
