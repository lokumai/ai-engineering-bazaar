import { z } from 'zod'
import { CALLOUT_KINDS } from '@/lib/content/callout'
import { TRANSLATIONS } from '@/lib/content/languages'
import { TRACK_IDS, type Track } from '@/lib/tracks'
import { ISO_DAY, SHORT_HASH } from '@/lib/record/validate'

/**
 * The content bundle's contract: every document under `out/api/`, as the
 * producer writes it (spec 2.6).
 *
 * **`z.strictObject` throughout**, as `curriculum-file.ts` does, so a key the
 * contract does not name fails the build instead of reaching the native reader
 * as a field nobody agreed to. Every route handler parses its document with
 * the schema here before it serialises it, and the e2e suite parses the export
 * with the same schemas, so there is one definition of the contract.
 *
 * **Field names and formats only, never content facts.** No module count, no
 * level slug, no title is written here; a language is checked against
 * `TRANSLATIONS` by a refine rather than an enum, so a new language (D80) is
 * an addition inside v1 rather than a schema change.
 *
 * **Every path is site-relative**: no base path and no leading slash (spec
 * 2.5), because the reader resolves it against whatever host served the
 * bundle, and a base path baked in would tie the bundle to one deploy.
 *
 * The key order of each object is the order a document is serialised in, and
 * the finaliser hashes the index in that order, so reordering keys here
 * changes every `contentVersion`. `bundle-schema.json` beside the schema test
 * shows any such change as a diff.
 */

export const BUNDLE_MAJOR = 1

const SCHEMA_VERSION = z.literal(BUNDLE_MAJOR)

const SHA256 = z.string().regex(/^[0-9a-f]{64}$/).describe('sha256 of the bytes, 64 lowercase hex.')

const SITE_PATH = z
  .string()
  .regex(/^[^/\s][^\s]*$/)
  .describe('A path relative to the site root: no base path and no leading slash.')

const LANGUAGE_IDS: readonly string[] = ['en', ...TRANSLATIONS.map((one) => one.id)]

const Lang = z
  .string()
  .refine((value) => LANGUAGE_IDS.includes(value), { message: 'not en or a languages.ts translation' })
  .describe('A language id: en, or one of the translations the index lists.')

const TranslatedLang = z
  .string()
  .refine((value) => TRANSLATIONS.some((one) => one.id === value), { message: 'not a languages.ts translation' })
  .describe('A translation id from languages.ts: never en.')

const Dir = z.enum(['ltr', 'rtl'])

const TrackId = z
  .string()
  .refine((value) => (TRACK_IDS as readonly string[]).includes(value), { message: 'not a tracks.ts track' })
  .describe('A track id from tracks.ts: engineers (For Engineers) or everyone (For Everyone).') as z.ZodType<Track>

export const ApiIndex = z.strictObject({
  majors: z.array(z.number().int().positive()).describe('The published majors; the app needs its own among them.'),
})

const Revision = z.strictObject({
  hash: z.string().regex(SHORT_HASH).describe('The short hash the app writes to signedRevision.'),
  date: z.string().regex(ISO_DAY),
})

const IndexLevel = z.strictObject({
  slug: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(['ready', 'draft']),
  blurb: z.string(),
  total: z.number().int().nonnegative().describe('Modules in this level, drafts included.'),
  readme: SITE_PATH.nullable().describe('The level document, or null when the level has no introduction.'),
})

/** One module in one track: what the catalog shows and where its documents are. */
export const IndexModuleTrack = z.strictObject({
  title: z.string().min(1).describe('The English title in this track.'),
  drawn: z.boolean().describe('Written in this track; an unwritten module has no documents.'),
  summary: z.string().nullable(),
  hasQuiz: z.boolean(),
  revision: Revision.nullable().describe('The commit that last touched this track\'s English file; signedRevision in this track\'s record map.'),
  docs: z.record(Lang, SITE_PATH).describe('Language id to its module document; empty where the module is not written in this track.'),
  words: z
    .record(Lang, z.number().int().positive())
    .describe('Language id to the word count its web page prints under the title; empty where the module is not written in this track (D128).'),
  webPath: SITE_PATH.describe('The English web page in this track.'),
}).refine((entry) => Object.keys(entry.words).every((lang) => lang in entry.docs), {
  message: 'words names a language docs does not',
  path: ['words'],
})

const IndexModule = z.strictObject({
  key: z.string().min(1).describe('The record key, <level>/<module>, in both tracks\' record maps.'),
  level: z.string().min(1),
  number: z.number().int().positive().describe('The position in curriculum.yaml.'),
  minutes: z.number().int().nonnegative(),
  prerequisites: z.array(z.string().min(1)).describe('Prerequisite module keys.'),
  tracks: z.record(TrackId, IndexModuleTrack).describe('Every track, in tracks.ts order.'),
})

/** An address the curriculum retired and where it answers now (moved.ts). */
const Moved = z.strictObject({
  levels: z.record(z.string().min(1), z.string().min(1)),
  modules: z.record(z.string().min(1), z.string().min(1)),
})

/** The Mermaid theme a diagram variant is drawn in and the ground it sits on. */
const DiagramTheme = z.strictObject({
  theme: z.string().min(1).describe('A Mermaid theme id from diagram-themes.ts.'),
  background: z.string().min(1).describe('Mermaid\'s own background for that theme, as CSS colour text.'),
})

export const Index = z.strictObject({
  schemaVersion: SCHEMA_VERSION,
  contentVersion: SHA256.describe('sha256 of the canonical index with contentVersion and publishedAt emptied.'),
  publishedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    .describe('The committer date of the commit built, in UTC.'),
  sourceLanguage: z.literal('en'),
  translations: z.array(z.strictObject({ id: Lang, label: z.string().min(1), dir: Dir })),
  tracks: z.array(z.strictObject({ id: TrackId, label: z.string().min(1) })).describe('tracks.ts, in order.'),
  diagramFont: z.strictObject({ family: z.literal('Vazirmatn'), sha256: SHA256 }),
  diagramThemes: z.strictObject({ light: DiagramTheme, dark: DiagramTheme }),
  levels: z.array(IndexLevel),
  modules: z.array(IndexModule),
  moved: Moved,
  story: z
    .record(Lang, SITE_PATH)
    .describe('The About page\'s story document per language it is written in: STORY.md, and STORY_tr.md and STORY_fa.md where they are written (D125, D132).'),
  files: z.record(SITE_PATH, SHA256).describe('Every file under api/v1/ except index.json and record-conformance.json.'),
  images: z.record(SITE_PATH, SHA256).describe('Every image a level or module document names.'),
})

/**
 * The About page's words (D115, D125, D132): `mini-courses/STORY.md` or a translation beside it as `lib/content/story.ts` reads it for the
 * page, so the reader and the page show the same story. Plain strings, as the page sets them: STORY.md's
 * inline marks are dropped to their text by the same reader.
 */
export const StoryDoc = z.strictObject({
  schemaVersion: SCHEMA_VERSION,
  lang: Lang,
  dir: Dir,
  title: z.string().min(1).nullable().describe('The file\'s # heading, or null when it has none.'),
  stalls: z
    .array(z.strictObject({
      heading: z.string().min(1).describe('A ## heading of STORY.md.'),
      paragraphs: z.array(z.string().min(1)).describe('The paragraphs under it, up to the next ## heading.'),
    }))
    .min(1)
    .describe('One per ## section, in file order.'),
  motto: z
    .strictObject({
      lead: z.string().min(1).describe('What introduces it, without its colon: Our motto.'),
      lines: z.array(z.string().min(1)).min(1).describe('The quotation, one sentence per entry, with curly quotation marks at its two ends.'),
    })
    .nullable()
    .describe('The closing line when it reads `Our motto: **"..."**`, or null.'),
})
export type StoryDoc = z.infer<typeof StoryDoc>

export const DIAGRAM_VARIANTS = ['light', 'dark'] as const

/** One diagram the finaliser draws: `source` is the remapped mermaid source. */
export const DiagramSource = z.strictObject({
  id: z.string().regex(/^[0-9a-f]{32}$/),
  variant: z.enum(DIAGRAM_VARIANTS),
  source: z.string().min(1),
})

/**
 * What the route writes and the finaliser completes: the index with its three
 * computed fields empty in their positions, and the two inputs only the
 * finaliser reads appended after them, which it deletes.
 */
export const IndexDraft = Index.extend({
  contentVersion: z.literal(''),
  files: z.strictObject({}),
  images: z.strictObject({}),
  diagrams: z.array(DiagramSource),
  render: z.strictObject({ light: z.unknown(), dark: z.unknown() })
    .describe('The serialised mermaid config the finaliser renders each variant with.'),
})

export const Tokens = z.strictObject({
  schemaVersion: SCHEMA_VERSION,
  light: z.record(z.string().regex(/^--/), z.string()),
  dark: z.record(z.string().regex(/^--/), z.string()),
})

export const LinkTarget = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('module'),
    key: z.string().min(1),
    track: TrackId,
    lang: Lang,
    fragment: z.string().min(1).optional().describe('The target heading id, without the # and not percent-encoded.'),
  }),
  z.strictObject({ kind: z.literal('external'), url: z.string().regex(/^https?:\/\//i) }),
  z.strictObject({
    kind: z.literal('anchor'),
    id: z.string().min(1).describe('A heading id in the same document, not percent-encoded.'),
  }),
  z.strictObject({ kind: z.literal('catalog') }),
])

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'code'; text: string }
  | { type: 'break' }
  | { type: 'strong'; inlines: Inline[] }
  | { type: 'emphasis'; inlines: Inline[] }
  | { type: 'delete'; inlines: Inline[] }
  | { type: 'link'; target: LinkTarget; inlines: Inline[] }
  | { type: 'logo'; src: string; alt: string; mono: boolean }

export const Inline: z.ZodType<Inline> = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('text'), text: z.string() }),
  z.strictObject({ type: z.literal('code'), text: z.string() }),
  z.strictObject({ type: z.literal('break') }),
  z.strictObject({ type: z.literal('strong'), get inlines() { return z.array(Inline) } }),
  z.strictObject({ type: z.literal('emphasis'), get inlines() { return z.array(Inline) } }),
  z.strictObject({ type: z.literal('delete'), get inlines() { return z.array(Inline) } }),
  z.strictObject({ type: z.literal('link'), target: LinkTarget, get inlines() { return z.array(Inline) } }),
  z.strictObject({
    type: z.literal('logo'),
    src: SITE_PATH.describe('A vendor mark, an SVG, drawn at the height of the text around it.'),
    alt: z.string(),
    mono: z.boolean().describe('A single-colour mark, inverted on a dark ground as the web does for a -mono.svg.'),
  }),
])

export const Cell = z.strictObject({ inlines: z.array(Inline) })

const Token = z.strictObject({
  text: z.string(),
  role: z.string().min(1).optional().describe(
    'The bz-tok-<role> suffix; coloured with --color-slab-<role>, or as a token with no role when the app has no such colour.',
  ),
  bold: z.literal(true).optional(),
})

const FIGURE_NUMBER = z.string().regex(/^\d+(?:\.\d+)?$/).describe(
  'Printed after TBL. on a table and after FIG. on an image or a diagram; the two sequences are counted apart and share numbers.',
)

export type Block =
  | { type: 'paragraph'; inlines: Inline[]; lead?: boolean }
  | { type: 'heading'; depth: 2 | 3 | 4; id: string; mark?: string; inlines: Inline[] }
  | { type: 'list'; ordered: boolean; start?: number; items: { task?: { checked: boolean }; blocks: Block[] }[] }
  | { type: 'quote'; label?: string; blocks: Block[] }
  | {
    type: 'callout'
    kind: (typeof CALLOUT_KINDS)[number]
    title: Inline[] | null
    blocks: Block[]
    action: { target: LinkTarget; inlines: Inline[] } | null
  }
  | { type: 'code'; language: string; lines: z.infer<typeof Token>[][] }
  | {
    type: 'table'
    number: string
    title: string | null
    rowHeaders: boolean
    align: ('left' | 'center' | 'right' | null)[]
    head: Cell[]
    rows: Cell[][]
  }
  | { type: 'image'; number: string; title: string | null; note: string | null; src: string; alt: string; width: number; height: number }
  | { type: 'diagram'; number: string; title: string | null; svg: { light: string; dark: string } }
  | { type: 'rule' }

export const Block: z.ZodType<Block> = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('paragraph'), inlines: z.array(Inline), lead: z.boolean().optional() }),
  z.strictObject({
    type: z.literal('heading'),
    depth: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    id: z.string().min(1),
    mark: z.string().min(1).optional(),
    inlines: z.array(Inline),
  }),
  z.strictObject({
    type: z.literal('list'),
    ordered: z.boolean(),
    start: z.number().int().optional(),
    items: z.array(z.strictObject({
      task: z.strictObject({ checked: z.boolean() }).optional(),
      get blocks() { return z.array(Block) },
    })),
  }),
  z.strictObject({
    type: z.literal('quote'),
    label: z.string().min(1).optional(),
    get blocks() { return z.array(Block) },
  }),
  z.strictObject({
    type: z.literal('callout'),
    kind: z.enum(CALLOUT_KINDS),
    title: z.array(Inline).nullable(),
    get blocks() { return z.array(Block) },
    action: z.strictObject({ target: LinkTarget, inlines: z.array(Inline) }).nullable()
      .describe('A last paragraph that is only a link, drawn as a button.'),
  }),
  z.strictObject({ type: z.literal('code'), language: z.string().min(1), lines: z.array(z.array(Token)) }),
  z.strictObject({
    type: z.literal('table'),
    number: FIGURE_NUMBER,
    title: z.string().nullable(),
    rowHeaders: z.boolean(),
    align: z.array(z.enum(['left', 'center', 'right']).nullable()),
    head: z.array(Cell),
    rows: z.array(z.array(Cell)),
  }),
  z.strictObject({
    type: z.literal('image'),
    number: FIGURE_NUMBER,
    title: z.string().nullable(),
    note: z.string().nullable(),
    src: SITE_PATH,
    alt: z.string(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  z.strictObject({
    type: z.literal('diagram'),
    number: FIGURE_NUMBER,
    title: z.string().nullable(),
    svg: z.strictObject({ light: SITE_PATH, dark: SITE_PATH }),
  }),
  z.strictObject({ type: z.literal('rule') }),
])

export const Ref = z.strictObject({
  key: z.string().min(1),
  number: z.number().int().positive(),
  title: z.string().min(1).describe('The English For Engineers title, as the web pager prints it.'),
  drawn: z.boolean().describe('Written in the track the reference lands in.'),
  track: TrackId.describe('The track of the page the reference lands on.'),
  lang: Lang.describe('The language of the page the reference lands on.'),
})

export const LevelDoc = z.strictObject({
  schemaVersion: SCHEMA_VERSION,
  slug: z.string().min(1),
  title: z.string().min(1),
  blocks: z.array(Block),
})

export const ModuleDoc = z.strictObject({
  schemaVersion: SCHEMA_VERSION,
  key: z.string().min(1),
  track: TrackId,
  lang: Lang,
  dir: Dir,
  title: z.string().min(1).describe('The title in this document\'s track and language.'),
  words: z
    .number()
    .int()
    .positive()
    .nullable()
    .describe('The word count the web page prints under the title; null for a draft, whose page prints none (D128).'),
  objectives: z.strictObject({ lang: z.literal('en'), items: z.array(z.string().min(1)) }),
  translatedObjectives: z
    .strictObject({ lang: TranslatedLang, items: z.array(z.string().min(1)).min(1) })
    .nullable()
    .describe('The objectives in this document\'s language, from its own file; null in English and where the file declares none (D124).'),
  prerequisites: z.array(Ref),
  previous: Ref.nullable(),
  next: Ref.nullable(),
  toc: z.array(z.strictObject({
    id: z.string().min(1),
    text: z.string(),
    depth: z.union([z.literal(2), z.literal(3)]),
    mark: z.string().min(1).optional(),
  })),
  body: z.array(Block).nullable().describe('Null for a draft, which renders no body.'),
  draft: z.strictObject({
    summary: z.string().nullable(),
    parts: z.array(z.string()),
    written: z.array(Block).nullable().describe('Sections a planned module already holds, drawn under its parts; null when none.'),
  }).nullable(),
  quiz: z.array(z.strictObject({
    question: z.string().min(1),
    options: z.array(z.string().min(1)),
    answer: z.number().int().nonnegative(),
    explain: z.string().min(1),
  })).nullable(),
}).refine((doc) => (doc.words === null) === (doc.draft !== null), {
  message: 'words is null exactly when the document is a draft',
  path: ['words'],
})

export type ApiIndex = z.infer<typeof ApiIndex>
export type Index = z.infer<typeof Index>
export type IndexDraft = z.infer<typeof IndexDraft>
export type Tokens = z.infer<typeof Tokens>
export type LevelDoc = z.infer<typeof LevelDoc>
export type ModuleDoc = z.infer<typeof ModuleDoc>
export type Ref = z.infer<typeof Ref>
export type LinkTarget = z.infer<typeof LinkTarget>
export type Cell = z.infer<typeof Cell>
export type DiagramSource = z.infer<typeof DiagramSource>
export type DiagramVariant = DiagramSource['variant']
