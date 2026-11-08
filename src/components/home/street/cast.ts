/**
 * The seven people at the foot of the gate (M58, from the author's picks in M49 and the art
 * finished in M50, `playground/2026-11-round-3/N-cast-final.html`), with Mihrî in the place
 * Leyla stood in: the cast had a foreign man, a foreign woman and a Turkish man and no
 * Turkish woman, and the author picked candidate D of
 * `playground/2026-11-round-4/P-turkish-woman.html` (2026-11-08). She is a poet drawn after
 * Mihrî Hatun of Amasya, with her hair uncovered, a gold circlet and her book of poems.
 *
 * Plain data, safe for the server page and the client motion alike: who each person is,
 * the words a reader reads (the caption and the story, English like the rest of the home
 * page, D80), and where each one stands, in the gate art's own units (`gate.html` is 1000 x
 * 620; the pavement below the arch runs from y 620, and is shown to y 750, see `home.css`).
 * `x` is the middle of the feet, `y` the line they stand on, and `s` the figure's scale
 * against its 220 x 400 drawing.
 *
 * The order is the L1b order the author picked, left to right: Mihrî (who was Leyla), Dariush
 * and Deniz to the left of the doorway, Bit in it, Murat at the jamb as the gate's guard, Mei and Piri to
 * the right. It is also the tab order. The outermost bodies end about 25 units outside the
 * art's width (x 0 to 1000), which the narrowest gate that places them still shows: at
 * 900px the art box is 94% of the window, 27px clear of each edge.
 */

export type CastId = 'mihri' | 'dariush' | 'deniz' | 'bit' | 'murat' | 'mei' | 'piri'

export interface CastMember {
  id: CastId
  name: string
  trade: string
  story: string
  x: number
  y: number
  s: number
}

/** Where the feet stand: the pavement, 30 units below the arch's threshold, leaving room under them for the captions. */
const FEET = 650
const ADULT = 0.7
const CHILD = 0.52
const ROBOT = 0.74

export const CAST: readonly CastMember[] = [
  {
    id: 'mihri',
    name: 'Mihrî',
    trade: 'poet',
    story: 'Mihrî of Amasya wrote the oldest book of poems by an Ottoman woman that still survives. She said what she meant in plain words.',
    x: 0,
    y: FEET,
    s: ADULT,
  },
  {
    id: 'dariush',
    name: 'Dariush',
    trade: 'carpet merchant',
    story: 'Dariush brought his carpets from Iran, each one tied by hand, knot by knot. He says you only see the pattern when you step back.',
    x: 125,
    y: FEET,
    s: ADULT,
  },
  {
    id: 'deniz',
    name: 'Deniz',
    trade: 'simit seller',
    story: "Deniz sells his father's simit at the gate every morning. He is the first to see who comes in, and the first to call out to them.",
    x: 245,
    y: FEET,
    s: CHILD,
  },
  {
    id: 'bit',
    name: 'Bit',
    trade: 'AI robot',
    story: 'Bit was built to answer questions. In the bazaar it found more questions than it could answer, so it went inside to learn.',
    x: 500,
    y: FEET + 6,
    s: ROBOT,
  },
  {
    id: 'murat',
    name: 'Murat',
    trade: 'Janissary',
    story: 'Murat guards the gate. He has watched every kind of trader pass through it, and he lets in anyone who comes to learn.',
    x: 768,
    y: FEET,
    s: ADULT,
  },
  {
    id: 'mei',
    name: 'Mei',
    trade: 'silk trader',
    story: 'Mei carried her silk along the long road from the east. She writes down every bolt she sells, because a trader who forgets loses money.',
    x: 880,
    y: FEET,
    s: ADULT,
  },
  {
    id: 'piri',
    name: 'Piri',
    trade: 'map-maker',
    story: 'Piri draws maps for sailors. Where he is not sure of a coast, he writes so on the map, because a wrong map is worse than no map.',
    x: 995,
    y: FEET,
    s: ADULT,
  },
]

/**
 * M63 — how much larger the walk draws the people than their scale above (the author, 2026-11-06:
 * "about 75% larger"). The walk can afford it because it spreads them across the facade; a page
 * that does not walk keeps them at 1, since at 900px the art box leaves no room between them.
 */
export const WALK_GROW = 1.75

/** The far end of the vaulted street, where the walk's zoom is centred and the chase runs to. */
export const VANISHING = { x: 500, y: 432 }

/** The gate art's box, and how much of the pavement below it the page shows. */
export const ART_W = 1000
export const ART_H = 620
export const PAVEMENT = 130
