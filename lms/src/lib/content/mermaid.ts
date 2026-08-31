/**
 * Requirements B2 and B3 — no hardcoded colour reaches a rendered diagram.
 *
 * The corpus carries 278 `fill:#…` declarations. 256 of them live in the
 * `## Tutorial Progress` rails, which `strip.ts` deletes outright (B1). The
 * 22 that survive are semantic — this box is the untrusted one, that box is
 * the verified one — and they are spelled in nine pastel hex values that were
 * chosen against a white page. Shipped as-is they would put pale-green boxes
 * with white labels on every security diagram in dark mode: a legibility bug
 * and, worse, a colour vocabulary that contradicts §2's.
 *
 * So each `style X fill:#HEX` becomes a `classDef` + `class` pair whose colours
 * are the design tokens themselves. The tokens re-theme, so the diagram
 * re-themes, with no re-render and no JavaScript (§9.2's 0ms theme switch).
 */

/** §6.10 B2's table, verbatim. These nine hexes are the whole corpus. */
export const MERMAID_FILL_CLASSES: Readonly<Record<string, string>> = {
  '#FFD9D9': 'fault',
  '#FFB3B3': 'fault',
  '#FFB6C1': 'fault',
  '#D6F5D6': 'verify',
  '#90EE90': 'verify',
  '#D9EAFF': 'info',
  '#ADD8E6': 'info',
  '#FFF3B0': 'caution',
  '#FFFF00': 'caution',
}

/** The four semantic classes, in the fixed order they are emitted. */
export const MERMAID_CLASSES = ['fault', 'verify', 'info', 'caution'] as const
export type MermaidClass = (typeof MERMAID_CLASSES)[number]

/** `style NODE fill:#HEX` and nothing else — anything richer must fail B3. */
const STYLE_FILL = /^(\s*)style\s+(\S+)\s+fill:\s*(#[0-9A-Fa-f]{3,8})\s*;?\s*$/
/** §6.10 B3's assertion, verbatim. */
const RAW_FILL = /fill:\s*#[0-9A-Fa-f]{3,8}/

function classDef(name: string): string {
  return `classDef ${name} fill:var(--color-${name}-wash),stroke:var(--color-${name})`
}

/**
 * Rewrite one mermaid source. Returns it unchanged when it declares no fills,
 * and throws on a hex outside the table — a new colour in the content is a
 * decision for a human, not a value for the build to guess at.
 */
export function remapMermaidFills(source: string): string {
  const lines = source.split('\n')
  const kept: string[] = []
  const nodesByClass = new Map<string, string[]>()
  let indent = '    '

  for (const line of lines) {
    const match = STYLE_FILL.exec(line)
    if (!match) {
      kept.push(line)
      continue
    }

    const [, leading, node, hex] = match
    const className = MERMAID_FILL_CLASSES[hex.toUpperCase()]
    if (!className) {
      throw new Error(
        `mermaid: ${hex} is not one of the nine fills §6.10 B2 maps. ` +
        'Add it to MERMAID_FILL_CLASSES with a deliberate semantic class, ' +
        'or change the diagram.',
      )
    }

    indent = leading === '' ? indent : leading
    const nodes = nodesByClass.get(className) ?? []
    if (!nodes.includes(node)) nodes.push(node)
    nodesByClass.set(className, nodes)
  }

  if (nodesByClass.size === 0) return source

  while (kept.length > 0 && kept[kept.length - 1].trim() === '') kept.pop()

  for (const name of MERMAID_CLASSES) {
    if (nodesByClass.has(name)) kept.push(`${indent}${classDef(name)}`)
  }
  for (const name of MERMAID_CLASSES) {
    const nodes = nodesByClass.get(name)
    if (nodes) kept.push(`${indent}class ${nodes.join(',')} ${name}`)
  }

  return kept.join('\n')
}

/**
 * §6.10 B3 — the build-time assertion, run on the finished HTML. Silent
 * failure here means dark mode ships with pastel boxes and white labels on
 * every security diagram, which is exactly the kind of thing nobody notices
 * until a reader does.
 */
export function assertNoRawHex(html: string, source: string): void {
  const match = RAW_FILL.exec(html)
  if (!match) return
  throw new Error(
    `${source}: a hardcoded diagram colour survived the build — "${match[0]}" ` +
    '(§6.10 B3). Every fill must be a semantic class from MERMAID_FILL_CLASSES.',
  )
}
