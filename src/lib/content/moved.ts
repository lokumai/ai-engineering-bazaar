/**
 * Addresses the curriculum retired, and where each one went (D94, 2026-11-06).
 *
 * A level or a module can be renamed or moved in `curriculum.yaml`, and a
 * reader may have bookmarked its old address, so the old address is still
 * built and forwards. This is a fact about the site's address history, not
 * about the course's content: nothing here says what a level holds or how many
 * modules it has, only that one address now answers at another.
 *
 * Imports nothing, so a route and a client island can both read it.
 */

/** An old level slug, and the slug its level answers at now. */
export const MOVED_LEVELS: Readonly<Record<string, string>> = {
  // "Protocols & Specs" became "Emerging Trends" (D94).
  protocols: 'trends',
}

/** An old `level/module` slug, and the one the module answers at now. */
export const MOVED_MODULES: Readonly<Record<string, string>> = {
  // The protocols reference moved into Ecosystem (D94).
  'protocols/protocols-reference': 'ecosystem/protocols-reference',
  // Advanced Training was split into Advanced Fine-tuning and Advanced
  // Post-training (D101); its address goes to the second, which kept most of
  // its topics.
  'expert/advanced-training': 'expert/advanced-post-training',
}

export function movedModuleOf(category: string, module: string): string | null {
  return MOVED_MODULES[`${category}/${module}`] ?? null
}

/** The `level/module` pairs a route prerenders as forwards. */
export function movedModuleParams(): { category: string; module: string }[] {
  return Object.keys(MOVED_MODULES).map((key) => {
    const [category, module] = key.split('/')
    return { category, module }
  })
}
