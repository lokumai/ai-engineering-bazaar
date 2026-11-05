/**
 * The one walk over a bundle document, imported by `scripts/finalize-bundle.mjs`
 * (which hashes every image a document names and names the documents a failed
 * diagram belongs to) and by `scripts/check-bundle-out.mjs` (which compares
 * both against the index). Two walks would be two answers to "which images
 * does the bundle name", and the checker would then agree with itself rather
 * than with the producer.
 *
 * **It dispatches on `type`, and an unknown `type` throws naming it.** The
 * shapes are the strict `Block` and `Inline` of `src/lib/bundle/schema.ts`,
 * which a script cannot import (spec 2.5), so the list of node types is
 * restated here once. A new block type that this walk skipped would hide every
 * image and diagram inside it from the index with no error; refusing it makes
 * the addition of a node type a change to this file as well.
 *
 * Plain `.mjs` with no imports, so the scripts load it without the TypeScript
 * toolchain.
 */

/** Where each node type keeps its children. A cell and a code token carry no `type`. */
const CHILDREN = Object.freeze({
  paragraph: (node) => node.inlines,
  heading: (node) => node.inlines,
  list: (node) => node.items.flatMap((item) => item.blocks),
  quote: (node) => node.blocks,
  code: () => [],
  table: (node) => [...node.head, ...node.rows.flat()].flatMap((cell) => cell.inlines),
  image: () => [],
  diagram: () => [],
  rule: () => [],
  text: () => [],
  break: () => [],
  strong: (node) => node.inlines,
  emphasis: (node) => node.inlines,
  delete: (node) => node.inlines,
  link: (node) => node.inlines,
})

/** The top-level blocks of a level document (`blocks`) or a module document (`body`, null for a draft). */
function rootsOf(doc) {
  if (doc !== null && typeof doc === 'object') {
    if (Array.isArray(doc.blocks)) return doc.blocks
    if (Object.hasOwn(doc, 'body')) return doc.body ?? []
  }
  throw new Error('bundle-walk: the document is neither a level document (blocks) nor a module document (body)')
}

/**
 * Every block and inline reachable from the document, parents before their
 * children, in document order.
 *
 * Inline `code` and block `code` share a name and both have no node children,
 * so one entry serves both.
 *
 * @param {Record<string, unknown>} doc a LevelDoc or a ModuleDoc
 * @returns {Array<Record<string, any>>}
 */
export function nodesOf(doc) {
  const nodes = []
  const visit = (node) => {
    const children = Object.hasOwn(CHILDREN, node?.type) ? CHILDREN[node.type] : undefined
    if (children === undefined) throw new Error(`bundle-walk: unknown node type "${node?.type}"`)
    nodes.push(node)
    for (const child of children(node)) visit(child)
  }
  for (const node of rootsOf(doc)) visit(node)
  return nodes
}

/**
 * Every `image.src` the document names, in document order.
 *
 * @param {Record<string, unknown>} doc
 * @returns {string[]}
 */
export function imagePaths(doc) {
  return nodesOf(doc).filter((node) => node.type === 'image').map((node) => node.src)
}

/**
 * Every diagram file the document names, light then dark for each diagram.
 *
 * @param {Record<string, unknown>} doc
 * @returns {string[]}
 */
export function diagramPaths(doc) {
  return nodesOf(doc)
    .filter((node) => node.type === 'diagram')
    .flatMap((node) => [node.svg.light, node.svg.dark])
}
