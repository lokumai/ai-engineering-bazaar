/**
 * M91, D116 — the cast and the props of C4, Shadow Play, as SVG strings, ported from
 * `playground/2026-11-round-5/C1-caravan-designs.html` (`camelSVG`, `personSVG`, `horseSVG`,
 * `stopArt`, `landmarkArt`, `STYLE_SHADOW`).
 *
 * Drawn in the home street's manner: flat fills from its palette, rounded forms. Every piece has its
 * feet at (0,0) and faces right, so the scene only has to stand it on the land. The shadow theatre
 * is a CSS treatment over these same drawings (`caravan.css`: a dark hide edge and a translucent
 * dye on every filled shape), as the mockup did it, so the colours here are the puppets' paint.
 *
 * The colours are art and live here, as the street's do in its SVG; the page's own colours are
 * custom properties (`palette.ts`). Class names carry `cv-` because the strings land in the page.
 */

export const ART = {
  camel: '#CDA46C', camelSh: '#B48A52', camelFar: '#9E7A48', hoof: '#5B4630',
  skin: ['#D9A47A', '#8A5A3C', '#C98F62', '#F0CFA6', '#D49A6A'],
  robe: ['#282864', '#A0503C', '#2F8C86', '#7A4A86', '#73501F', '#B8873B'],
  cream: '#F6EEDF', stone: '#EFE6D6', stoneD: '#D6C7AC', brick: '#C9785F', wood: '#9C6C34', woodD: '#6B4B2C',
  iron: '#25233F', teal: '#2F8C86', tealL: '#63B2AB', gold: '#C99A4B', goldL: '#DDB46A', cobalt: '#282864', shadow: '#2B2947',
  red: '#B3262E', plum: '#7A4A86', plumD: '#573260', mountain: '#8C8AA8', snow: '#F7F4EE', sea: '#63B2AB',
} as const

/** The goods a stop's merchant sells, by colour: the mockup's GOODS, cycled by a trend's place on the road. */
const PACKS = ['#A0503C', '#E6DAC6', '#B8873B', '#DDB46A', '#7A4A86', '#9E9585', '#2F8C86', '#63B2AB', '#C9C6E4', '#282864', '#C99A4B', '#73501F'] as const

export function packOf(index: number): string {
  return PACKS[index % PACKS.length]
}

function mix(c1: string, c2: string, t: number): string {
  const parse = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
  const a = parse(c1)
  const b = parse(c2)
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')
}

/** A camel, side on. `pack` is the colour of its first load, or null for none. */
export function camelSVG(pack: string | null, blanket: string = ART.brick): string {
  const leg = (x: number, col: string) => `<path d="M${x} 56 Q${x - 3} 77 ${x} 97" stroke="${col}" stroke-width="5.4" stroke-linecap="round" fill="none"/><ellipse cx="${x + 1.5}" cy="98" rx="3.6" ry="2" fill="${ART.hoof}"/>`
  const bundle = pack ? `<rect x="39" y="40" width="28" height="23" rx="4" fill="${pack}"/><path d="M39 47h28M39 55h28" stroke="#00000026" stroke-width="2"/><path d="M53 40v23" stroke="#00000020" stroke-width="1.5"/>` : ''
  return `<g transform="translate(-60 -100)">
    <g class="cv-legs-b">${leg(39, ART.camelFar)}${leg(81, ART.camelFar)}</g>
    <path d="M18 47C12 52 12 60 14 66" stroke="${ART.camelSh}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path class="cv-body" d="M18 52C16 40 26 32 38 33C44 18 62 14 72 30C78 32 84 36 88 42C92 34 94 22 98 14C100 9 108 8 112 11L116.5 16.5C113 18.5 109 18.5 107 19.5C104 28 100 40 96 50C93 58 88 62 80 62L32 62C24 62 19 58 18 52Z" fill="${ART.camel}"/>
    <path d="M32 62L80 62C76 55 40 55 32 62Z" fill="${ART.camelSh}"/><path d="M104 10l-2-5 4 3Z" fill="${ART.camelSh}"/><circle cx="109" cy="13" r="1.3" fill="${ART.iron}"/>
    <g class="cv-legs-a">${leg(31, ART.camel)}${leg(89, ART.camel)}</g>
    <path d="M34 47C40 25 64 22 72 40L72 47Z" fill="${blanket}"/><path d="M34 47H72" stroke="${ART.goldL}" stroke-width="2.4" stroke-dasharray="2 3"/>
    ${bundle}
    <path d="M96 30 C92 38 70 50 72 54" stroke="${ART.woodD}" stroke-width="1.2" fill="none" opacity=".7"/>
  </g>`
}

interface Person {
  skin?: string; robe?: string; sash?: string; turban?: string; beard?: string
  hat?: 'fez' | 'cap' | ''; prop?: 'lantern' | 'banner' | ''; flag?: string; legs?: boolean
}

/** A person in period dress, side on. */
export function personSVG(o: Person = {}): string {
  const skin = o.skin ?? ART.skin[0]
  const robe = o.robe ?? ART.cobalt
  const robeD = '#00000030'
  const sash = o.sash ?? ART.goldL
  const hat = o.hat === 'fez'
    ? `<path d="M-6 -71 L-5 -80 L6 -80 L7 -71Z" fill="#A0503C"/><path d="M5 -80 q5 3 4 9" stroke="${ART.iron}" stroke-width="1.2" fill="none"/>`
    : o.hat === 'cap'
      ? `<path d="M-8 -70 C-8 -79 8 -79 8 -70Z" fill="${ART.tealL}"/><rect x="-9" y="-71.5" width="18" height="3" rx="1.5" fill="${ART.gold}"/>`
      : `<ellipse cx="0" cy="-72" rx="9.4" ry="6.2" fill="${o.turban ?? ART.cream}"/><path d="M-6 -75 q6 -4 12 0" stroke="#00000018" stroke-width="2" fill="none"/><path d="M-8 -70 q-4 6 -2 12" stroke="${o.turban ?? ART.cream}" stroke-width="3" fill="none" stroke-linecap="round"/>`
  const beard = o.beard ? `<path d="M-1 -62 C0 -54 7 -55 8 -61Z" fill="${o.beard}"/>` : ''
  const prop = o.prop === 'lantern'
    ? `<path d="M10 -36 L13 -92" stroke="${ART.woodD}" stroke-width="2.4" stroke-linecap="round"/><path d="M13 -92 q9 0 9 8" stroke="${ART.iron}" stroke-width="1.3" fill="none"/>
      <g><circle cx="22" cy="-77" r="9" fill="${ART.goldL}" opacity=".28" class="cv-glow"/><rect x="18.5" y="-84" width="7" height="10" rx="2" fill="${ART.goldL}"/><path d="M18 -84h8M18 -74h8" stroke="${ART.iron}" stroke-width="1.6"/></g>`
    : o.prop === 'banner'
      ? `<path d="M10 -36 L12 -100" stroke="${ART.woodD}" stroke-width="2.4" stroke-linecap="round"/><path class="cv-flag" d="M12 -100 C22 -102 28 -96 36 -98 L34 -86 C26 -84 20 -90 12 -88Z" fill="${o.flag ?? ART.teal}"/>`
      : ''
  const legs = o.legs === false ? '' : `<g><path class="cv-lg1" d="M-3 -16 L-5 -1" stroke="${ART.woodD}" stroke-width="4" stroke-linecap="round"/><path class="cv-lg2" d="M3 -16 L5 -1" stroke="${ART.woodD}" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="-4" cy="-1" rx="4" ry="2" fill="${ART.iron}"/><ellipse cx="6" cy="-1" rx="4" ry="2" fill="${ART.iron}"/></g>`
  return `<g class="cv-person">${legs}
    <path d="M-8 -58C-12 -40 -14 -24 -15 -12L15 -12C13 -26 11 -42 8 -58Z" fill="${robe}"/>
    <path d="M-15 -12L15 -12L14.4 -16L-14.4 -16Z" fill="${robeD}"/>
    <rect x="-10.6" y="-40" width="21.2" height="5" rx="1.5" fill="${sash}"/>
    <path d="M-2 -60 L4 -60 L3 -55 L-1 -55Z" fill="${skin}"/>
    <circle cx="1" cy="-66" r="7.6" fill="${skin}"/><circle cx="8" cy="-65.5" r="2" fill="${skin}"/><circle cx="5" cy="-68" r="1.1" fill="${ART.iron}"/>
    ${beard}${hat}${prop}
    <path d="M1 -55 L10 -37" stroke="${robe}" stroke-width="5.4" stroke-linecap="round"/><path d="M1 -55 L10 -37" stroke="${robeD}" stroke-width="5.4" stroke-linecap="round" opacity=".5"/><circle cx="10.5" cy="-36" r="2.6" fill="${skin}"/>
  </g>`
}

/** The caravan bashi's horse. */
function horseSVG(body: string, dark: string, saddle: string): string {
  const leg = (x: number, col: string) => `<path d="M${x} 40 L${x - 1} 58 L${x} 70" stroke="${col}" stroke-width="4.6" stroke-linecap="round" fill="none"/>`
  return `<g transform="translate(-42 -72)">
    <g class="cv-legs-b">${leg(20, dark)}${leg(60, dark)}</g>
    <path d="M10 30 C6 36 6 46 9 52" stroke="${dark}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M12 30 C12 20 22 18 34 19 L56 19 C62 12 66 4 72 2 C78 0 84 4 86 9 L84 13 C80 12 77 13 75 15 C72 22 68 30 66 36 C64 42 58 44 50 44 L22 44 C15 44 12 38 12 30Z" fill="${body}"/>
    <path d="M58 18 C62 8 68 2 74 1 L70 10 C66 14 62 20 60 22Z" fill="${dark}"/>
    <circle cx="79" cy="6" r="1.2" fill="${ART.iron}"/>
    <g class="cv-legs-a">${leg(26, body)}${leg(66, body)}</g>
    <path d="M28 18 C30 10 46 10 48 18 L48 26 L28 26Z" fill="${saddle}"/><path d="M28 26h20" stroke="${ART.goldL}" stroke-width="2"/>
  </g>`
}

/* ---- the four puppets, each on its rod -------------------------------------------------------- */

export function leaderPuppet(): string {
  return `<g class="cv-puppet">${horseSVG(ART.plum, ART.plumD, ART.red)}<g transform="translate(4 -46) scale(.95)">${personSVG({ robe: ART.teal, turban: ART.cream, beard: '#2A1C18', prop: 'banner', flag: ART.red, legs: false })}</g><path class="cv-rod" d="M0 -40 L30 260"/></g>`
}

export function driverPuppet(): string {
  return `<g class="cv-puppet" style="--cv-delay:-.3s">${personSVG({ robe: '#B8873B', skin: ART.skin[1], hat: 'fez', prop: 'lantern', sash: ART.red, beard: '#2A1C18' })}<path class="cv-rod" d="M0 -40 L14 260"/></g>`
}

/** A camel puppet carrying up to three loads, one per trend on the road, in their colours. */
export function camelPuppet(loads: readonly string[], k: number): string {
  const [a, b, c] = loads
  const extra = `<g transform="translate(-60 -100)">${b ? `<rect x="43" y="8" width="22" height="15" rx="4" fill="${b}"/><path d="M43 15h22" stroke="#00000026" stroke-width="2"/>` : ''}${c ? `<ellipse cx="33" cy="40" rx="7" ry="9" fill="${c}"/>` : ''}</g>`
  return `<g class="cv-puppet" style="--cv-delay:${(k * -0.17).toFixed(2)}s">${camelSVG(a ?? null, ART.red)}${extra}<path class="cv-rod" d="M-4 -48 L22 260"/></g>`
}

/* ---- a stop's prop, by how strong the trend was ------------------------------------------------ */

export interface StopArtInput {
  id: string
  /** The trend's place on the road, for its merchant and its goods. */
  index: number
  /** Its highest measured level, or null when unmeasured. */
  peak: number | null
}

/** A serai for a level-5 trend, a tent for 4, a stall for 3 or unmeasured, a stone below. */
export function stopArt(x: StopArtInput): { svg: string; top: number } {
  const pack = packOf(x.index)
  const level = x.peak ?? 3
  const kind = level >= 5 ? 'serai' : level === 4 ? 'tent' : level === 3 ? 'stall' : 'stone'
  const i = x.index
  const merchant = (dx: number) => `<g transform="translate(${dx} 0) scale(-0.9 0.9)">${personSVG({ robe: ART.robe[i % 6], skin: ART.skin[i % 5], turban: i % 3 ? ART.cream : ART.goldL, hat: i % 4 === 1 ? 'fez' : i % 4 === 3 ? 'cap' : '', beard: i % 2 ? '#2A1C18' : '' })}</g>`
  const goods = (dx: number) => `<g transform="translate(${dx} 0)"><path d="M-14 0 C-15 -12 -6 -16 -1 -15 C4 -16 12 -12 11 0Z" fill="${pack}"/><path d="M2 0 C1 -9 8 -12 12 -11 C17 -11 21 -7 20 0Z" fill="${mix(pack, '#000000', 0.18)}"/><path d="M-6 -15 l3 -4 3 4" stroke="${ART.woodD}" stroke-width="1.4" fill="none"/></g>`
  let art = ''
  let top = 0
  if (kind === 'serai') {
    top = -150
    art = `<rect x="-92" y="-92" width="184" height="92" fill="${ART.stone}"/><path d="M-92 -92h184" stroke="${ART.stoneD}" stroke-width="4"/>
      ${[-80, -56, -32, 32, 56, 80].map((v) => `<rect x="${v - 6}" y="-100" width="12" height="9" fill="${ART.stone}"/>`).join('')}
      <circle cx="0" cy="-96" r="34" fill="${ART.tealL}"/><path d="M-34 -96 A34 34 0 0 1 34 -96Z" fill="${ART.teal}" opacity=".35"/><path d="M0 -130 v-14" stroke="${ART.gold}" stroke-width="3"/><circle cx="0" cy="-146" r="4" fill="${ART.goldL}"/>
      <rect x="-104" y="-122" width="26" height="122" fill="${ART.stone}"/><rect x="78" y="-122" width="26" height="122" fill="${ART.stone}"/>
      <path d="M-104 -122 a13 13 0 0 1 26 0Z M78 -122 a13 13 0 0 1 26 0Z" fill="${ART.brick}"/>
      <path d="M-30 0 V-46 A30 30 0 0 1 30 -46 V0Z" fill="${ART.brick}"/><path d="M-23 0 V-44 A23 23 0 0 1 23 -44 V0Z" fill="${ART.shadow}"/>
      <path d="M-16 0 V-36 A16 16 0 0 1 16 -36 V0Z" fill="#3a3456"/><circle cx="0" cy="-30" r="5" fill="${ART.goldL}" class="cv-lamp"/>
      ${[-62, -46, 46, 62].map((v) => `<path d="M${v - 5} -54 V-66 a5 5 0 0 1 10 0 V-54Z" fill="${ART.shadow}"/>`).join('')}
      <path d="M-91 -122 V-146" stroke="${ART.woodD}" stroke-width="2"/><path class="cv-flag" d="M-91 -146 C-80 -148 -74 -142 -66 -144 L-68 -132 C-76 -130 -82 -136 -91 -134Z" fill="${pack}"/>
      <path d="M91 -122 V-146" stroke="${ART.woodD}" stroke-width="2"/><path class="cv-flag" d="M91 -146 C102 -148 108 -142 116 -144 L114 -132 C106 -130 100 -136 91 -134Z" fill="${pack}"/>
      ${goods(-64)}${merchant(52)}`
  } else if (kind === 'tent') {
    top = -112
    art = `<path d="M-62 0 L-50 -56 Q0 -104 50 -56 L62 0Z" fill="${pack}"/>
      ${[-36, -12, 12, 36].map((v, k) => (k % 2 ? '' : `<path d="M${v * 0.82} -70 L${v * 1.15} 0 L${v * 1.15 + 10} 0 L${v * 0.82 + 8} -72Z" fill="${ART.cream}" opacity="0.55"/>`)).join('')}
      <path d="M-50 -56 Q0 -40 50 -56" stroke="${mix(pack, '#000000', 0.25)}" stroke-width="3" fill="none"/>
      <path d="M-14 0 L0 -44 L14 0Z" fill="${ART.shadow}"/><path d="M0 -44 L-20 0 L-12 0Z" fill="${mix(pack, '#000000', 0.2)}"/>
      <path d="M0 -84 V-104" stroke="${ART.woodD}" stroke-width="2.4"/><path class="cv-flag" d="M0 -104 C10 -106 16 -100 24 -102 L22 -90 C14 -88 8 -94 0 -92Z" fill="${ART.goldL}"/>
      ${goods(-74)}${merchant(64)}`
  } else if (kind === 'stall') {
    top = -92
    art = `<path d="M-40 -64 V0 M40 -64 V0" stroke="${ART.wood}" stroke-width="5"/>
      <rect x="-44" y="-34" width="88" height="34" rx="3" fill="${ART.wood}"/><path d="M-44 -24h88" stroke="${ART.woodD}" stroke-width="2"/>
      <path d="M-52 -64 L52 -64 L46 -80 L-46 -80Z" fill="${ART.cream}"/>${[-46, -24, -2, 20].map((v) => `<path d="M${v} -80 L${v + 11} -80 L${v + 12} -64 L${v} -64Z" fill="${pack}"/>`).join('')}
      <path d="M-52 -64 q8 8 16 0 q8 8 16 0 q8 8 16 0 q8 8 16 0 q8 8 16 0 q8 8 16 0 q8 8 8 0" fill="${pack}"/>
      ${[-30, -14, 2, 18].map((v, k) => `<circle cx="${v + 4}" cy="-40" r="7" fill="${k % 2 ? pack : mix(pack, '#ffffff', 0.25)}"/>`).join('')}
      ${merchant(56)}`
  } else {
    top = -70
    art = `<path d="M-12 0 V-40 A12 12 0 0 1 12 -40 V0Z" fill="${ART.stoneD}"/><path d="M-6 -36h12M-6 -28h12M-6 -20h8" stroke="${ART.woodD}" stroke-width="1.6" opacity=".6"/>
      <path d="M18 0 V-64" stroke="${ART.woodD}" stroke-width="2"/><path class="cv-flag" d="M18 -64 C28 -66 34 -60 42 -62 L40 -50 C32 -48 26 -54 18 -52Z" fill="${pack}"/>`
  }
  return { svg: `<g class="cv-stopg" data-id="${x.id}">${art}</g>`, top }
}

/* ---- the places the road passes, one a year (`places.ts` names them in this order) ---------- */

function palm(x: number, y: number, s = 1): string {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 C2 -20 -2 -40 6 -62" stroke="${ART.wood}" stroke-width="5" fill="none" stroke-linecap="round"/>
  ${[[-30, -52], [-24, -72], [8, -84], [32, -70], [36, -50], [-8, -82]].map(([a, b]) => `<path d="M6 -62 Q${(6 + a) / 2} ${b - 12} ${a} ${b}" stroke="${ART.teal}" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('')}</g>`
}

export function landmarkArt(place: number): string {
  if (place === 0) {
    return `<g><rect x="-150" y="-120" width="300" height="120" fill="${ART.stone}"/>${[-140, -110, -80, 80, 110, 140].map((v) => `<rect x="${v - 8}" y="-132" width="16" height="13" fill="${ART.stone}"/>`).join('')}
    <rect x="-70" y="-180" width="40" height="180" fill="${ART.stone}"/><rect x="30" y="-180" width="40" height="180" fill="${ART.stone}"/><path d="M-70 -180 a20 20 0 0 1 40 0Z M30 -180 a20 20 0 0 1 40 0Z" fill="${ART.brick}"/>
    <path d="M-30 0 V-80 A30 30 0 0 1 30 -80 V0Z" fill="${ART.shadow}"/><path d="M-30 -80 A30 30 0 0 1 30 -80" stroke="${ART.brick}" stroke-width="7" fill="none"/></g>`
  }
  if (place === 1) {
    return `<g><ellipse cx="0" cy="-6" rx="130" ry="16" fill="${ART.tealL}"/><ellipse cx="0" cy="-8" rx="96" ry="9" fill="#9fd3cc" opacity=".7"/>${palm(-110, 0, 1.4)}${palm(-60, -4, 1.1)}${palm(90, 0, 1.5)}${palm(140, -2, 1.05)}</g>`
  }
  if (place === 2) {
    return `<g>${[[-150, 70, 22], [-90, 110, 34], [-20, 90, 28], [50, 120, 40], [120, 80, 24]].map(([x0, hh, r]) => `<rect x="${x0}" y="${-hh}" width="${r * 2 + 10}" height="${hh}" fill="${ART.stone}"/><circle cx="${x0 + r + 5}" cy="${-hh}" r="${r}" fill="${ART.tealL}"/>`).join('')}
    <rect x="176" y="-200" width="18" height="200" fill="${ART.stone}"/><rect x="172" y="-160" width="26" height="8" fill="${ART.stoneD}"/><path d="M176 -200 L185 -226 L194 -200Z" fill="${ART.teal}"/></g>`
  }
  if (place === 3) {
    return `<g><path d="M-220 0 L-120 -210 L-60 -130 L0 -260 L80 -150 L140 -210 L230 0Z" fill="${ART.mountain}"/><path d="M-120 -210 L-140 -170 L-112 -180 L-96 -164 Z M0 -260 L-28 -206 L2 -220 L26 -200Z M140 -210 L124 -176 L144 -184 L160 -170Z" fill="${ART.snow}"/></g>`
  }
  return `<g><path d="M-30 -14 C-70 20 -90 80 -120 386 L3200 386 L3200 -14Z" fill="${ART.sea}"/><path d="M-30 -14 C-70 20 -90 80 -120 386" stroke="${ART.cream}" stroke-width="6" fill="none" opacity=".7"/><path d="M-60 -10 q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#ffffff" stroke-width="2" fill="none" opacity=".6"/>
    <g transform="translate(140 -14)"><path d="M-60 0 L60 0 L46 22 L-46 22Z" fill="${ART.wood}"/><path d="M0 0 V-120" stroke="${ART.woodD}" stroke-width="4"/><path d="M4 -116 C40 -90 44 -40 4 -16Z" fill="${ART.cream}"/><path d="M-4 -104 C-36 -80 -38 -40 -4 -20Z" fill="${ART.cream}" opacity=".85"/><path class="cv-flag" d="M0 -120 C10 -122 16 -116 24 -118 L22 -108 C14 -106 8 -112 0 -110Z" fill="${ART.brick}"/></g>
    <rect x="-40" y="-150" width="30" height="136" fill="${ART.stone}"/><path d="M-40 -150 L-25 -176 L-10 -150Z" fill="${ART.brick}"/><circle cx="-25" cy="-158" r="6" fill="${ART.goldL}" class="cv-lamp"/></g>`
}

/** A year's post: a pole and a medallion with the year on it. Its box, for the labels to clear, is `POST_BOX`. */
export function postArt(year: number, scale: number): string {
  return `<g class="cv-post" transform="scale(${scale})"><path d="M0 0 V-96" stroke="currentColor" stroke-width="3"/>
    <circle cx="0" cy="-118" r="26" fill="${ART.red}"/><circle cx="0" cy="-118" r="19" fill="${ART.goldL}"/><text x="0" y="-112" class="cv-post-year">${year}</text>
    <path d="M-26 -118 C-40 -132 -40 -150 -26 -156 M26 -118 C40 -132 40 -150 26 -156" stroke="${ART.teal}" stroke-width="5" fill="none" stroke-linecap="round"/></g>`
}

/** The post's extent in its own units, before `scale`: the medallion's curls and the pole under it. */
export const POST_BOX = { left: -40, right: 40, top: -158, bottom: 0 } as const

/** The glow a lit stop takes: an SVG filter, so its colour stays in the art. */
export const GLOW_FILTER = `<defs><filter id="cv-glow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#ffd68c" flood-opacity=".9"/></filter></defs>`
