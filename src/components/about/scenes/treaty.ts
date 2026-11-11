import { STALL_GROUNDS } from '../palette'

/**
 * Stall 1, "Down the table, revised" (1B6, the author's pick, D115): the Hall of Mirrors, 1919. A
 * woman in the spirit of Hürrem Sultan asks "Is the coffee ready?" and holds out an empty cup; five
 * diplomats pass the treaty down a short green table to her, page by page, while she taps her foot
 * and falls asleep; page 412 says yes, and she raises a steaming cup.
 *
 * Ported from `playground/2026-11-round-5/R1b-treaty-alternatives.html` (`vSultana`, the Versailles
 * helpers and `piece('o1b6')`). The playground built the drawing as a string and then moved it by
 * setting attributes every frame. Here the moving part is one pure function, `frame(t)`, and the
 * drawing is written FROM a frame: the server writes `frame(STILL_AT)` into the page, which is the
 * picture with no script and under reduced motion (page 412, the yes page, the raised cup), and the
 * island (`treaty-motion.ts`) applies `frame(t)` to the same nodes while the stall is on screen.
 *
 * The speech bubbles, the articles read out on the way and the tally are the scene's own words, art
 * like the meme captions in stall 4, not the story; they live here and nowhere else.
 */

export const STALL1 = {
  QUESTION: 'Is the coffee ready?',
  ANSWER: 'yes',
  /** The treaty's name, over its page tally, so the joke names the document it is made of. */
  TITLE: 'Treaty of Versailles',
  ARTICLES: ['On the Nature of Coffee', 'On Beans, Considered Holistically', 'On the Temperature of Water', 'On Personal Preference', 'On What Was Not Asked'],
} as const

/** The treaty's length, which the tally counts to. */
export const PAGES = 412

/** The art's colours, from the playground's tokens; the fades at the top and bottom meet stall 1's own ground. */
const C = {
  gilt: '#C99A4B', giltLight: '#E8C682', marble: '#8A4A52', marbleDark: '#5A2A36', mirror: '#9AA2DA', mirrorDeep: '#2B2D63',
  window: '#E6C98A', wall: '#E9DCC0', baize: '#3F7A5E', baizeDark: '#2A5644', parquet: '#5A3E22', coat: '#1B1A26', velvet: '#8E2F35',
  cream: '#F6EEDF', ink: '#16163A', trousers: '#3A3846', skin1: '#C98F62', skin2: '#F0CFA6', tealDeep: '#2F8C86', plum: '#7A4A86',
  crimson: '#A0503C', gold: '#DDB46A', periwinkle: '#848BD0', ground: STALL_GROUNDS[0], skinFair: '#F6DCC8', auburn: '#A4452A', kaftan: '#9E2A33',
}

/* ---------------------------------------------------------------- timing, as the playground had it */
const N = 5
const SLOT = 1.55
const T0 = 3.0
export const LOOP = 16.5
/** Where the still picture stands: the last page found, the cup raised. */
export const STILL_AT = 13.6
/**
 * Where the question stands in the still, in percent of the stage: above her head and clear of the
 * answer's bubble. The loop shows the question only in its first two seconds, so a still at the
 * answer would tell half the joke; the still shows both (review A, item 6).
 */
export const ASK_IN_STILL = { left: 24, top: 29 } as const
const END = T0 + N * SLOT
const XD = (i: number) => 640 + 205 * i
const XR = XD(N - 1) + 60
const T1 = XD(N - 1) + 170
const SC = 0.54
const OY = 232
const CAM = (250 + T1 + 40) / 2 - 500 / SC

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const smooth = (k: number) => {
  k = clamp(k, 0, 1)
  return k * k * (3 - 2 * k)
}
const F = (n: number) => (+n).toFixed(1)
function rng(a: number): () => number {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const roman = (n: number) => {
  const m: [number, string][] = [[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  let s = ''
  for (const [v, c] of m) while (n >= v) { s += c; n -= v }
  return s
}

/* ---------------------------------------------------------------- one moment of the scene */
export interface Frame {
  strip: string
  stack: string
  fest: string[]
  /** One per diplomat, in drawing order. */
  dips: { holding: boolean; quill: boolean; head: string }[]
  her: {
    head: string; asleep: boolean; brow: string; hem: string; smiling: boolean; zz: string; page: boolean
    cupOut: boolean; cupTilt: string; arm: string; raised: string; steam: string; steamOpacity: string
  }
  tally: { page: number; on: boolean }
  /** The bubbles, placed in percent of the stage. */
  ask: { left: number; top: number; on: boolean }
  reply: { left: number; top: number; on: boolean; text: string }
}

function lead(t: number): { j: number; x: number; f?: number } {
  const j = (t - T0) / SLOT
  if (j < 0) return { j: -1, x: XD(N - 1) + 40 }
  const ji = Math.floor(j)
  const f = j - ji
  if (ji >= N) return { j: N, x: 420 }
  const xa = XD(N - 1 - ji)
  const xb = ji + 1 >= N ? 420 : XD(N - 2 - ji)
  return { j: ji, x: f < 0.72 ? xa : lerp(xa, xb, smooth((f - 0.72) / 0.28)), f }
}

export function frame(t: number): Frame {
  const ld = lead(t)
  const xl = Math.max(ld.x - 30, 430)
  const sh = 30 + 80 * clamp((t - T0) / (END - T0), 0, 1)
  const fest: string[] = []
  for (let i = 0; i < N; i++) {
    const xa = XD(i) + 102
    const xb = XD(i) - 102
    const g = smooth((t - (T0 + SLOT * (N - i))) / 1.2)
    fest.push(g > 0 ? `M${xa} 642 C${xa - 40} ${F(642 + 230 * g)} ${xb + 40} ${F(642 + 230 * g)} ${xb} 642` : 'M0 0')
  }
  const dips = Array.from({ length: N }, (_, i) => {
    const j = N - 1 - i
    const holding = ld.j === j && (ld.f ?? 0) < 0.72
    const nod = ld.j > j ? 7 * Math.max(0, Math.sin(t * 1.4 + i)) : 0
    return {
      holding,
      quill: holding && (ld.f ?? 0) > 0.4,
      head: holding ? `rotate(${F(3 * Math.sin(t * 6))} 0 -210) translate(0 8)` : `rotate(${F(nod)} 0 -170)`,
    }
  })
  const impatient = smooth((t - 2.4) / 0.6) * (1 - smooth((t - 5.4) / 0.8))
  const asleep = smooth((t - 5.4) / 1.2) * (1 - smooth((t - END - 0.3) / 0.3))
  const woke = smooth((t - END - 0.3) / 0.4)
  const use = smooth((t - END - 1.6) / 0.5)
  const pages = t < T0 ? 1 : Math.min(PAGES, Math.round(1 + (PAGES - 1) * Math.pow(clamp((t - T0) / (END - T0), 0, 1), 1.3)))
  const place = (wx: number, wy: number) => ({ left: clamp(((wx - CAM) * SC) / 10, 24, 76), top: (OY + wy * SC) / 10 })

  let reply: Frame['reply'] = { ...place(640, 330), on: false, text: '' }
  if (ld.j >= 0 && ld.j < N) {
    reply = { ...place(XD(N - 1 - ld.j), 400), on: (ld.f ?? 0) < 0.72, text: `Article ${roman(Math.round(pages / 3) || 1)}. ${STALL1.ARTICLES[ld.j % STALL1.ARTICLES.length]}.` }
  }

  return {
    strip: `M${F(xl)} 616 L${XR} 616 L${XR + 10} 630 L${F(xl - 6)} 630 Z`,
    stack: `M${XR} ${F(612 - sh)} h90 v${F(sh)} h-90 Z`,
    fest,
    dips,
    her: {
      head: `rotate(${F(-12 * asleep + 5 * woke * Math.sin(t * 2))} 0 -350) translate(0 ${F(12 * asleep)})`,
      asleep: asleep > 0.6,
      brow: `translate(0 ${F(4 * impatient - 7 * woke + 3 * asleep)})`,
      hem: `translate(0 ${impatient > 0.5 ? F(-7 * Math.max(0, Math.sin(t * 10))) : 0})`,
      smiling: woke > 0.5,
      zz: `translate(0 ${F(-((t * 30) % 40))})`,
      page: woke > 0.5,
      cupOut: use <= 0,
      cupTilt: `rotate(${F(-(impatient * (18 + 10 * Math.sin(t * 7))) - 6 * (1 - asleep))})`,
      arm: `rotate(${F(-118 * use)} 38 -324)`,
      raised: `translate(124 ${F(-412 + 40 * (1 - use))}) scale(1.5) rotate(${F(5 * Math.sin(t * 3))})`,
      steam: `translate(0 ${F(-((t * 14) % 10))})`,
      steamOpacity: F(0.6 + 0.4 * Math.sin(t * 4)),
    },
    tally: { page: pages, on: t > T0 && t < LOOP - 0.3 },
    ask: { ...place(350, 300), on: t > 0.2 && t < 2.4 },
    reply,
  }
}

/* ---------------------------------------------------------------- the drawing, written from a frame */
const vis = (on: boolean) => (on ? 'visible' : 'hidden')

const VDEFS = (id: string) => `<defs>
  <pattern id="${id}-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><line x1="0" y1="0" x2="0" y2="7" stroke="${C.ink}" stroke-width="1.1" opacity=".28"/></pattern>
  <linearGradient id="${id}-mirror" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.mirror}"/><stop offset=".55" stop-color="${C.mirrorDeep}"/><stop offset="1" stop-color="${C.mirror}" stop-opacity=".8"/></linearGradient>
  <linearGradient id="${id}-marble" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.marble}"/><stop offset=".5" stop-color="${C.marbleDark}"/><stop offset="1" stop-color="${C.marble}"/></linearGradient>
  <linearGradient id="${id}-gilt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.giltLight}"/><stop offset="1" stop-color="${C.gilt}"/></linearGradient>
  <radialGradient id="${id}-glow"><stop offset="0" stop-color="${C.giltLight}" stop-opacity=".75"/><stop offset="1" stop-color="${C.giltLight}" stop-opacity="0"/></radialGradient>
  <radialGradient id="${id}-sky" cx=".5" cy=".6" r=".7"><stop offset="0" stop-color="#F0D9A8"/><stop offset=".6" stop-color="#C9785F"/><stop offset="1" stop-color="${C.plum}"/></radialGradient>
  <radialGradient id="${id}-sky2" cx=".5" cy=".5" r=".7"><stop offset="0" stop-color="#E9E2F0"/><stop offset=".6" stop-color="${C.periwinkle}"/><stop offset="1" stop-color="${C.mirrorDeep}"/></radialGradient>
</defs>`

interface Diplomat { skin: string; hair: string; hc: string; mo: string; beard: boolean; specs: boolean }

/** A cast of diplomats: frock coat, wing collar, and the moustaches of 1919. */
function diplomats(n: number, seed: number): Diplomat[] {
  const r = rng(seed)
  const hairs = ['bald', 'part', 'white', 'part', 'bald', 'white']
  const mos = ['walrus', 'handle', 'brush', 'walrus', 'handle', 'none']
  const greys = ['#D9D4CA', '#9A958C', '#3A3036', '#C8C2B6', '#5A4A40']
  const skins = [C.skin2, '#E2B48C', C.skin1, '#EFC9A4', '#D49A6A']
  return Array.from({ length: n }, () => {
    const v = { skin: skins[Math.floor(r() * skins.length)], hair: hairs[Math.floor(r() * hairs.length)], hc: greys[Math.floor(r() * greys.length)], mo: mos[Math.floor(r() * mos.length)], beard: r() < 0.22, specs: r() < 0.3 }
    r() // the playground drew a phase here; it is kept so the cast stays the cast
    return v
  })
}

function vHead(v: Diplomat): string {
  let s = `<ellipse cx="-32" cy="-208" rx="7" ry="11" fill="${v.skin}"/><ellipse cx="32" cy="-208" rx="7" ry="11" fill="${v.skin}"/><ellipse cx="0" cy="-210" rx="31" ry="40" fill="${v.skin}"/>`
  if (v.hair === 'bald') s += `<path d="M-32 -204 Q-36 -234 -24 -240 L-22 -214 Z M32 -204 Q36 -234 24 -240 L22 -214 Z" fill="${v.hc}"/><path d="M-14 -246 Q0 -250 14 -246" stroke="#fff" stroke-opacity=".35" stroke-width="4" fill="none"/>`
  else if (v.hair === 'part') s += `<path d="M-33 -210 Q-37 -256 0 -254 Q35 -254 33 -212 Q27 -236 8 -240 Q-14 -238 -33 -210 Z" fill="${v.hc}"/>`
  else s += `<path d="M-35 -212 Q-46 -252 -10 -258 Q32 -264 37 -226 Q41 -208 34 -202 Q30 -232 0 -238 Q-26 -236 -34 -202 Z" fill="${v.hc}"/>`
  s += `<path d="M-21 -224 L-5 -227 M5 -227 L21 -224" stroke="${v.hc}" stroke-width="3.6" stroke-linecap="round"/>`
  s += `<ellipse cx="-12" cy="-214" rx="3.4" ry="3.8" fill="${C.ink}"/><ellipse cx="12" cy="-214" rx="3.4" ry="3.8" fill="${C.ink}"/>`
  if (v.specs) s += `<circle cx="-12" cy="-214" r="8" fill="none" stroke="${C.gilt}" stroke-width="1.8"/><circle cx="12" cy="-214" r="8" fill="none" stroke="${C.gilt}" stroke-width="1.8"/><path d="M-4 -215 L4 -215" stroke="${C.gilt}" stroke-width="1.8"/>`
  s += `<path d="M0 -212 L-6 -193 L4 -191" stroke="rgba(60,30,20,.35)" stroke-width="2.6" fill="none" stroke-linejoin="round"/>`
  if (v.beard) s += `<path d="M-30 -200 Q-32 -156 0 -146 Q32 -156 30 -200 Q20 -176 0 -174 Q-20 -176 -30 -200 Z" fill="${v.hc}"/>`
  s += `<path d="M-7 -178 Q0 -176 7 -178" stroke="#5A2A2A" stroke-width="2.4" fill="none"/>`
  if (v.mo === 'walrus') s += `<path d="M-25 -185 Q-12 -197 0 -190 Q12 -197 25 -185 Q23 -172 12 -177 Q0 -181 -12 -177 Q-23 -172 -25 -185 Z" fill="${v.hc}"/>`
  else if (v.mo === 'handle') s += `<path d="M-2 -188 Q-14 -194 -24 -186 Q-33 -181 -30 -193 M2 -188 Q14 -194 24 -186 Q33 -181 30 -193" stroke="${v.hc}" stroke-width="5.5" fill="none" stroke-linecap="round"/>`
  else if (v.mo === 'brush') s += `<rect x="-10" y="-193" width="20" height="8" rx="2" fill="${v.hc}"/>`
  return s
}

/** A diplomat seated behind the table, facing us; origin at the table's front edge. */
function vDipFront(v: Diplomat, d: Frame['dips'][number]): string {
  return `<rect x="-64" y="-300" width="128" height="300" rx="16" fill="${C.velvet}" stroke="${C.gilt}" stroke-width="6"/><path d="M-50 -300 Q0 -338 50 -300" fill="${C.gilt}"/>
  <path d="M-80 14 L-74 -108 Q-64 -150 -22 -158 L22 -158 Q64 -150 74 -108 L80 14 Z" fill="${C.coat}"/>
  <path d="M-22 -158 L22 -158 L0 -66 Z" fill="#F4F1EA"/><path d="M-22 -158 L-5 -72 M22 -158 L5 -72" stroke="#454556" stroke-width="3.5" fill="none"/>
  <rect x="-12" y="-178" width="24" height="22" fill="${v.skin}"/><path d="M-15 -162 L-2 -152 L-17 -147 Z M15 -162 L2 -152 L17 -147 Z" fill="#FFFDF7"/><path d="M-3 -151 L-15 -158 L-15 -144 Z M3 -151 L15 -158 L15 -144 Z" fill="#111"/>
  <g class="t-hd" transform="${d.head}">${vHead(v)}</g>
  <g class="t-ad" visibility="${vis(!d.holding)}"><path d="M-66 -118 Q-82 -40 -46 -8 M66 -118 Q82 -40 46 -8" stroke="${C.coat}" stroke-width="30" stroke-linecap="round" fill="none"/><circle cx="-44" cy="-8" r="11" fill="#FFFDF7"/><circle cx="44" cy="-8" r="11" fill="#FFFDF7"/><ellipse cx="-36" cy="-4" rx="15" ry="10" fill="${v.skin}"/><ellipse cx="36" cy="-4" rx="15" ry="10" fill="${v.skin}"/></g>
  <g class="t-au" visibility="${vis(d.holding)}"><path d="M-66 -118 Q-80 -60 -40 -96 M66 -118 Q80 -60 40 -96" stroke="${C.coat}" stroke-width="30" stroke-linecap="round" fill="none"/>
    <rect x="-50" y="-166" width="100" height="80" fill="${C.cream}" stroke="#B9AC95" stroke-width="2"/><path d="M-38 -150 H38 M-38 -138 H30 M-38 -126 H38 M-38 -114 H24 M-38 -102 H34" stroke="#8A7F6B" stroke-width="3"/>
    <ellipse cx="-44" cy="-98" rx="14" ry="11" fill="${v.skin}"/><ellipse cx="44" cy="-98" rx="14" ry="11" fill="${v.skin}"/></g>`
}

/** A chandelier: gilt rings, crystal drops, candle flames; origin at its body. */
function vChandelier(id: string, rod: number): string {
  let s = `<path d="M0 ${-rod} V-40" stroke="${C.gilt}" stroke-width="5"/><circle cx="0" cy="-10" r="120" fill="url(#${id}-glow)"/>`
  s += `<ellipse cx="0" cy="0" rx="78" ry="16" fill="none" stroke="${C.gilt}" stroke-width="7"/><ellipse cx="0" cy="-46" rx="46" ry="10" fill="none" stroke="${C.gilt}" stroke-width="6"/>`
  s += `<path d="M-78 0 Q-60 -60 0 -70 Q60 -60 78 0" fill="none" stroke="${C.gilt}" stroke-width="4"/><path d="M0 -70 V40" stroke="${C.gilt}" stroke-width="6"/>`
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2
    const x = Math.cos(a) * 78
    const y = Math.sin(a) * 16
    s += `<path d="M${F(x)} ${F(y)} v22" stroke="#EFE9F7" stroke-width="2" opacity=".8"/><circle cx="${F(x)}" cy="${F(y + 26)}" r="5" fill="#F4F0FA"/>`
    if (i % 2 === 0) s += `<rect x="${F(x - 4)}" y="${F(y - 26)}" width="8" height="22" fill="#FFF7E6"/><ellipse cx="${F(x)}" cy="${F(y - 32)}" rx="5" ry="8" fill="#FFE2A0" class="t-flick"/>`
  }
  s += `<circle cx="0" cy="48" r="9" fill="#F4F0FA"/><path d="M-46 -46 Q0 -10 46 -46" fill="none" stroke="#EFE9F7" stroke-width="2" opacity=".7"/>`
  return s
}

/**
 * The woman who asks, in the spirit of Hürrem Sultan as she is usually pictured: fair, auburn braids
 * under a small jewelled crown, a crimson kaftan of gold brocade, no head covering. Origin at her feet.
 */
function vSultana(h: Frame['her'], extra: string): string {
  const skin = C.skinFair
  const hair = C.auburn
  const k = C.kaftan
  const gold = C.gold
  let brocade = ''
  for (let y = -300; y < -40; y += 46) {
    for (let x = -64; x <= 64; x += 32) {
      const w = (y + 340) / 6.2
      if (Math.abs(x) > w + 18 || Math.abs(x) < 14) continue
      brocade += `<path d="M${x} ${y} q-7 9 0 18 q7 -9 0 -18 Z M${x - 6} ${y + 18} h12" fill="${gold}" stroke="${gold}" stroke-width="1.6" opacity=".85"/>`
    }
  }
  // an empty Turkish coffee cup on its saucer, held out; at the end it is full, raised and steaming
  const cup = (fill: string) => `<ellipse cx="0" cy="8" rx="27" ry="6" fill="${C.cream}" stroke="${gold}" stroke-width="2"/><path d="M-14 -14 h28 l-4 20 h-20 Z" fill="${C.cream}" stroke="${gold}" stroke-width="2"/>
    <path d="M-13 -6 h26" stroke="${C.crimson}" stroke-width="3"/><path d="M14 -10 q10 2 4 12" stroke="${gold}" stroke-width="2.5" fill="none"/><ellipse cx="0" cy="-14" rx="14" ry="3.4" fill="${fill}"/>`
  const props = `<g class="t-rest" visibility="${vis(h.cupOut)}" transform="translate(64 -212)"><g class="t-tilt" transform="${h.cupTilt}">${cup('#E9DCC6')}</g></g>
    <g class="t-use" visibility="${vis(!h.cupOut)}" transform="${h.raised}">${cup('#3A2216')}
      <path class="t-steam" transform="${h.steam}" opacity="${h.steamOpacity}" d="M-6 -22 q-8 -14 0 -26 q8 -12 0 -26 M6 -22 q-8 -14 0 -26 q8 -12 0 -26" stroke="#FFFFFF" stroke-opacity=".9" stroke-width="4" fill="none" stroke-linecap="round"/></g>`
  const buttons = [0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${-19 - i * 0.7}" cy="${-300 + i * 44}" r="4" fill="${gold}"/><circle cx="${19 + i * 0.7}" cy="${-300 + i * 44}" r="4" fill="${gold}"/>`).join('')
  return `<ellipse cx="0" cy="0" rx="84" ry="13" fill="rgba(0,0,0,.35)"/>
  <g class="t-hem" transform="${h.hem}"><ellipse cx="-20" cy="-5" rx="17" ry="7" fill="${gold}"/><ellipse cx="20" cy="-5" rx="17" ry="7" fill="${gold}"/></g>
  <path d="M-36 -334 Q-62 -200 -90 -8 L90 -8 Q62 -200 36 -334 Q0 -348 -36 -334 Z" fill="${k}"/>
  <path d="M-16 -334 L-26 -8 L26 -8 L16 -334 Z" fill="${C.cream}"/><path d="M-10 -330 L-16 -8 M10 -330 L16 -8" stroke="${gold}" stroke-width="4"/>
  ${brocade}${buttons}
  <path d="M-90 -8 L90 -8 L88 -30 L-88 -30 Z" fill="${gold}"/><path d="M-88 -30 L88 -30" stroke="${C.ink}" stroke-opacity=".25" stroke-width="2"/>
  <path d="M-48 -240 Q0 -226 48 -240 L46 -218 Q0 -206 -46 -218 Z" fill="${gold}"/><circle cx="0" cy="-226" r="8" fill="${C.tealDeep}" stroke="${gold}" stroke-width="3"/>
  <path d="M-38 -324 Q-74 -260 -76 -196 L-46 -196 Q-46 -250 -26 -300 Z" fill="${k}"/><path d="M-76 -196 L-46 -196" stroke="${gold}" stroke-width="6"/><ellipse cx="-60" cy="-188" rx="12" ry="11" fill="${skin}"/>
  <g class="t-arm" transform="${h.arm}"><path d="M38 -324 Q72 -270 74 -222 L46 -218 Q46 -260 26 -300 Z" fill="${k}"/><path d="M74 -222 L46 -218" stroke="${gold}" stroke-width="6"/><ellipse cx="62" cy="-212" rx="12" ry="11" fill="${skin}"/></g>
  ${props}
  <rect x="-11" y="-356" width="22" height="26" fill="${skin}"/>
  <path d="M-30 -334 Q0 -318 30 -334" fill="none" stroke="#FFF7EC" stroke-width="5" stroke-dasharray="1 7" stroke-linecap="round"/><circle cx="0" cy="-320" r="7" fill="${C.crimson}" stroke="${gold}" stroke-width="3"/>
  <g class="t-head" transform="${h.head}">
    <path d="M-34 -396 Q-50 -330 -44 -250 Q-30 -246 -26 -258 Q-32 -320 -20 -370 Z M34 -396 Q50 -330 44 -250 Q30 -246 26 -258 Q32 -320 20 -370 Z" fill="${hair}"/>
    <path d="M-40 -330 l8 10 l-8 10 l8 10 l-8 10 l8 10 l-8 10 M40 -330 l-8 10 l8 10 l-8 10 l8 10 l-8 10 l8 10" stroke="rgba(0,0,0,.22)" stroke-width="2.5" fill="none"/>
    <circle cx="-44" cy="-246" r="6" fill="${gold}"/><circle cx="44" cy="-246" r="6" fill="${gold}"/>
    <ellipse cx="0" cy="-384" rx="29" ry="36" fill="${skin}"/>
    <path d="M-31 -386 Q-34 -424 0 -424 Q34 -424 31 -386 Q24 -410 4 -412 L0 -404 L-4 -412 Q-24 -410 -31 -386 Z" fill="${hair}"/>
    <path d="M-24 -418 L-20 -446 L-10 -428 L0 -452 L10 -428 L20 -446 L24 -418 Z" fill="${gold}" stroke="#9A7330" stroke-width="2"/>
    <circle cx="0" cy="-432" r="5" fill="${C.crimson}"/><circle cx="-14" cy="-424" r="3.5" fill="${C.tealDeep}"/><circle cx="14" cy="-424" r="3.5" fill="${C.tealDeep}"/>
    <path d="M-29 -380 v14 M29 -380 v14" stroke="${gold}" stroke-width="2"/><circle cx="-29" cy="-362" r="4.5" fill="${gold}"/><circle cx="29" cy="-362" r="4.5" fill="${gold}"/>
    <ellipse cx="-17" cy="-372" rx="7" ry="4" fill="#F0A8A0" opacity=".5"/><ellipse cx="17" cy="-372" rx="7" ry="4" fill="#F0A8A0" opacity=".5"/>
    <g class="t-open" visibility="${vis(!h.asleep)}"><ellipse cx="-11" cy="-388" rx="7" ry="7.5" fill="#FFFDF7"/><ellipse cx="11" cy="-388" rx="7" ry="7.5" fill="#FFFDF7"/>
      <circle cx="-12" cy="-387" r="3.8" fill="#3A5A4A"/><circle cx="10" cy="-387" r="3.8" fill="#3A5A4A"/>
      <path d="M-19 -393 Q-11 -398 -3 -393 M3 -393 Q11 -398 19 -393" stroke="${C.ink}" stroke-width="2.4" fill="none"/></g>
    <g class="t-shut" visibility="${vis(h.asleep)}"><path d="M-18 -387 Q-11 -381 -4 -387 M4 -387 Q11 -381 18 -387" stroke="${C.ink}" stroke-width="2.6" fill="none"/></g>
    <path class="t-brow" transform="${h.brow}" d="M-19 -401 Q-12 -405 -5 -402 M5 -402 Q12 -405 19 -401" stroke="#7A3020" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M0 -386 L-4 -371 L3 -370" stroke="rgba(120,60,40,.35)" stroke-width="2" fill="none"/>
    <path class="t-lips" visibility="${vis(!h.smiling)}" d="M-8 -360 Q0 -356 8 -360 Q0 -364 -8 -360 Z" fill="#B8434A"/>
    <path class="t-smile" visibility="${vis(h.smiling)}" d="M-12 -362 Q0 -346 12 -362 Q0 -358 -12 -362 Z" fill="#9A3038" stroke="#B8434A" stroke-width="2"/></g>
  ${extra}`
}

/** The whole drawing, inside a 1000 x 1000 `<svg>`, as `f` has it. */
export function treatyMarkup(f: Frame, display: string): string {
  const id = 'tr'
  const BAY = 260
  const W0 = -200
  const W1 = 2100
  let wall = VDEFS(id)
  wall += `<rect x="${W0}" y="0" width="${W1 - W0}" height="262" fill="${C.gilt}"/>`
  for (let x = W0, k = 0; x < W1; x += BAY, k++) {
    wall += `<rect x="${x + 26}" y="26" width="${BAY - 52}" height="170" rx="22" fill="url(#${id}-${k % 2 ? 'sky' : 'sky2'})" stroke="${C.giltLight}" stroke-width="8"/>`
    wall += `<ellipse cx="${x + 90}" cy="${120 + (k % 3) * 14}" rx="46" ry="16" fill="#FFF7E6" opacity=".55"/><ellipse cx="${x + 160}" cy="${96 + (k % 2) * 30}" rx="34" ry="12" fill="#FFF7E6" opacity=".45"/><circle cx="${x}" cy="110" r="22" fill="${C.giltLight}" stroke="${C.gilt}" stroke-width="5"/>`
  }
  wall += `<rect x="${W0}" y="0" width="${W1 - W0}" height="262" fill="url(#${id}-hatch)" opacity=".6"/><rect x="${W0}" y="222" width="${W1 - W0}" height="40" fill="url(#${id}-gilt)"/><rect x="${W0}" y="262" width="${W1 - W0}" height="10" fill="${C.gilt}"/>`
  let dent = ''
  for (let x = W0; x < W1; x += 22) dent += `M${x} 238h12v12h-12Z`
  wall += `<path d="${dent}" fill="${C.gilt}" opacity=".8"/><rect x="${W0}" y="272" width="${W1 - W0}" height="640" fill="${C.wall}"/>`
  for (let x = W0; x < W1; x += BAY) {
    wall += `<rect x="${x}" y="272" width="56" height="628" fill="url(#${id}-marble)"/><rect x="${x - 6}" y="272" width="68" height="40" fill="url(#${id}-gilt)"/><rect x="${x - 6}" y="860" width="68" height="40" fill="${C.gilt}"/>`
    const a0 = x + 78
    const a1 = x + BAY - 22
    const r = (a1 - a0) / 2
    const cx = (a0 + a1) / 2
    wall += `<path d="M${a0} 840 V476 A${r} ${r} 0 0 1 ${a1} 476 V840 Z" fill="url(#${id}-mirror)" stroke="${C.gilt}" stroke-width="9"/>`
    wall += `<path d="M${cx - r / 3} 840 V${476 - r * 0.94} M${cx + r / 3} 840 V${476 - r * 0.94} M${a0} 560 H${a1} M${a0} 650 H${a1} M${a0} 740 H${a1}" stroke="${C.gilt}" stroke-width="4" opacity=".85"/>`
    wall += `<path d="M${a0 + 20} 840 L${a0 + 70} 420 L${a0 + 100} 420 L${a0 + 50} 840 Z" fill="#FFFFFF" opacity=".1"/><circle cx="${cx}" cy="520" r="6" fill="${C.giltLight}" opacity=".7"/>`
    wall += `<rect x="${a0 - 4}" y="840" width="${a1 - a0 + 8}" height="60" fill="${C.marbleDark}"/><path d="M${cx - 24} 330 a24 24 0 1 0 48 0 a24 24 0 1 0 -48 0" fill="none" stroke="${C.gilt}" stroke-width="7"/>`
  }
  wall += `<rect x="${W0}" y="272" width="${W1 - W0}" height="628" fill="url(#${id}-hatch)" opacity=".35"/><rect x="${W0}" y="900" width="${W1 - W0}" height="110" fill="${C.parquet}"/>`
  let pq = ''
  for (let x = W0; x < W1 + 100; x += 60) pq += `M${x} 900 L${x - 60} 1010 M${x} 900 L${x + 60} 1010`
  wall += `<path d="${pq}" stroke="rgba(0,0,0,.28)" stroke-width="1.5"/>`

  const cast = diplomats(N, 41)
  cast[1].mo = 'handle'
  cast[2].beard = true
  cast[3].mo = 'walrus'
  cast[3].specs = true
  cast[4].hair = 'bald'
  const dips = cast
    .map((v, i) => `<g class="t-dip" transform="translate(${XD(i)} 640)">${vDipFront(v, f.dips[i])}<g class="t-qu" visibility="${vis(f.dips[i].quill)}"><path d="M44 -100 L92 -186 L70 -110 Z" fill="#FFFDF7" stroke="#B9AC95" stroke-width="2"/></g></g>`)
    .join('')

  const TL = 470
  let table = `<rect x="${TL}" y="612" width="${T1 - TL}" height="30" fill="${C.baize}"/><rect x="${TL}" y="640" width="${T1 - TL}" height="282" fill="${C.baizeDark}"/><rect x="${TL}" y="640" width="${T1 - TL}" height="12" fill="${C.gilt}"/><rect x="${TL}" y="906" width="${T1 - TL}" height="8" fill="${C.gilt}"/>`
  let fr = ''
  for (let x = TL + 6; x < T1; x += 16) fr += `M${x} 914 v14`
  table += `<path d="${fr}" stroke="${C.gilt}" stroke-width="4"/>`
  for (let i = 0; i < N; i++) table += `<circle cx="${XD(i) + 76}" cy="626" r="8" fill="${C.ink}"/>`
  table += `<path class="t-strip" d="${f.strip}" fill="${C.cream}" stroke="#B9AC95" stroke-width="1.5"/><g class="t-fest">${f.fest
    .map((d) => `<path d="${d}" fill="none" stroke="${C.cream}" stroke-width="30" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#9A8F7B" stroke-width="3" stroke-dasharray="12 8"/>`)
    .join('')}</g><path class="t-stack" d="${f.stack}" fill="${C.cream}" stroke="#A89A80" stroke-width="1.5"/>`

  const page = `<g class="t-page" visibility="${vis(f.her.page)}" transform="translate(-6 66)"><circle cx="-34" cy="-300" r="120" fill="url(#${id}-glow)"/><rect x="-92" y="-376" width="110" height="138" fill="${C.cream}" stroke="${C.gilt}" stroke-width="4"/>
    <path d="M-78 -356 H4 M-78 -342 H-4 M-78 -278 H4 M-78 -264 H-10" stroke="#8A7F6B" stroke-width="3"/><rect x="-78" y="-326" width="82" height="34" rx="5" fill="${C.gold}"/>
    <text x="-37" y="-300" text-anchor="middle" font-family="${display.replace(/"/g, "'")}" font-weight="700" font-size="27" fill="#241A0E">${STALL1.ANSWER}</text></g>`
  const zz = `<g class="t-zz" visibility="${vis(f.her.asleep)}" transform="${f.her.zz}" font-family="${display.replace(/"/g, "'")}" font-style="italic" font-size="34" fill="${C.periwinkle}"><text x="36" y="-450">z</text><text x="60" y="-490">z</text><text x="88" y="-534">z</text></g>`
  const her = `<g transform="translate(350 930) scale(1.36)">${vSultana(f.her, page + zz)}</g>`
  let fg = ''
  for (let i = -1; i < N; i++) fg += `<g transform="translate(${XD(i) + 102} 300) scale(.95)">${vChandelier(id, 280)}</g>`

  const view = `translate(0 ${OY}) scale(${SC}) translate(${F(-CAM)} 0)`
  const fades = `<defs><linearGradient id="${id}-ft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.ground}"/><stop offset=".45" stop-color="${C.ground}" stop-opacity=".85"/><stop offset="1" stop-color="${C.ground}" stop-opacity="0"/></linearGradient>
    <linearGradient id="${id}-fb" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${C.ground}"/><stop offset="1" stop-color="${C.ground}" stop-opacity="0"/></linearGradient></defs>
    <rect x="-400" y="-60" width="2600" height="200" fill="url(#${id}-ft)" transform="translate(0 ${OY}) scale(${SC})"/><rect x="-400" y="880" width="2600" height="200" fill="url(#${id}-fb)" transform="translate(0 ${OY}) scale(${SC})"/>`
  return `<g transform="${view}">${wall}${dips}${table}${her}</g><g transform="${view}">${fg}</g>${fades}`
}

/** The tally's words, around the page it has reached. */
export const tallyWords = (page: number) => ({ before: 'PAGE ', page: String(page), after: ` OF ${PAGES}` })
