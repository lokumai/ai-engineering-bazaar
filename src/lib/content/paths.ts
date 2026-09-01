import path from 'node:path'

/**
 * The corpus sits beside the app rather than inside `src/`: the repository root
 * is the Next.js project, and `mini-courses/` is the authored markdown at the
 * top of it. Resolved from cwd, which npm and next both run at that root.
 */
export const CONTENT_ROOT = path.resolve(process.cwd(), 'mini-courses')
