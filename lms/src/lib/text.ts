/**
 * Text helpers with no dependencies of their own.
 *
 * A leaf module on purpose: components on both sides of the server/client
 * boundary need these, and everything in `lib/content/` reads the file system.
 */

/**
 * `1 SHEET`, `9 SHEETS`. Protocols & Specs is a subsystem of one, and a design
 * whose whole claim is that its numbers are measured cannot print `1 SHEETS`.
 */
export function plural(n: number, singular: string, many = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : many}`
}
