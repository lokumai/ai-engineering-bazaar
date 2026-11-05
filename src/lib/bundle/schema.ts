import { z } from 'zod'
import { TRANSLATIONS } from '@/lib/content/languages'
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

const Dir = z.enum(['ltr', 'rtl'])

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

const IndexModule = z.strictObject({
  key: z.string().min(1).describe('The record key, <level>/<module>.'),
  level: z.string().min(1),
  number: z.number().int().positive().describe('The position in curriculum.yaml.'),
  title: z.string().min(1),
  drawn: z.boolean(),
  minutes: z.number().int().nonnegative(),
  summary: z.string().nullable(),
  prerequisites: z.array(z.string().min(1)).describe('Prerequisite module keys.'),
  hasQuiz: z.boolean(),
  revision: Revision.nullable(),
  docs: z.record(Lang, SITE_PATH).describe('Language id to its module document; en is always present.'),
  webPath: SITE_PATH.describe('The English web page.'),
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
  diagramFont: z.strictObject({ family: z.literal('Vazirmatn'), sha256: SHA256 }),
  levels: z.array(IndexLevel),
  modules: z.array(IndexModule),
  files: z.record(SITE_PATH, SHA256).describe('Every file under api/v1/ except index.json and record-conformance.json.'),
  images: z.record(SITE_PATH, SHA256).describe('Every image a level or module document names.'),
})

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
  render: z.unknown().describe('The serialised mermaid config the finaliser renders with.'),
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

export const Inline: z.ZodType<Inline> = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('text'), text: z.string() }),
  z.strictObject({ type: z.literal('code'), text: z.string() }),
  z.strictObject({ type: z.literal('break') }),
  z.strictObject({ type: z.literal('strong'), get inlines() { return z.array(Inline) } }),
  z.strictObject({ type: z.literal('emphasis'), get inlines() { return z.array(Inline) } }),
  z.strictObject({ type: z.literal('delete'), get inlines() { return z.array(Inline) } }),
  z.strictObject({ type: z.literal('link'), target: LinkTarget, get inlines() { return z.array(Inline) } }),
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
  title: z.string().min(1).describe('The English title, as the web pager prints it.'),
  drawn: z.boolean(),
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
  lang: Lang,
  dir: Dir,
  title: z.string().min(1).describe('The title in this document\'s language.'),
  objectives: z.strictObject({ lang: z.literal('en'), items: z.array(z.string().min(1)) }),
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
  draft: z.strictObject({ summary: z.string().nullable(), parts: z.array(z.string()) }).nullable(),
  quiz: z.array(z.strictObject({
    question: z.string().min(1),
    options: z.array(z.string().min(1)),
    answer: z.number().int().nonnegative(),
    explain: z.string().min(1),
  })).nullable(),
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
