/**
 * The two media queries every script that animates asks, written once. Every one of them
 * once had the literal, and a misspelled one is a query that is never true: motion would play
 * for a reader who asked for none, and no test would see it.
 */
export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
export const NO_MOTION_PREFERENCE = '(prefers-reduced-motion: no-preference)'
