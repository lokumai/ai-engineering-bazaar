import path from 'node:path'

/**
 * Content lives outside the app so that MkDocs and the LMS read the same files.
 * Resolved from the app root (npm and next both run with cwd = lms/).
 */
export const CONTENT_ROOT = path.resolve(process.cwd(), '..', 'mini-courses')
