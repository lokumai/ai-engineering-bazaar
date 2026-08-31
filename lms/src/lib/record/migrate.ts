/**
 * §12.1.2 — the migration ladder. Forward-only, sequential, one function per
 * step, each independently unit-testable against a frozen fixture of the older
 * shape.
 *
 * At SCHEMA_VERSION 1 the ladder is empty. It is built anyway because it is
 * the mechanism that stops a future version destroying the only copy of a
 * record that exists anywhere, and a mechanism added under pressure, on the
 * day a shape changes, is a mechanism that gets skipped.
 *
 * **The contract for whoever adds step 1 → 2.** Append exactly one function to
 * MIGRATIONS and bump SCHEMA_VERSION to 2 in the same commit — the test
 * `MIGRATIONS.length === SCHEMA_VERSION - 1` fails otherwise. The function at
 * index `n - 1` takes a payload at version `n` and returns one at version
 * `n + 1`. It receives UNTRUSTED, UNCOERCED `unknown` — read defensively, do
 * not assume the v1 coercer ran, and never mutate the input. It must never
 * throw: a throw here is indistinguishable from data loss. Coercion happens
 * once, at the end of the ladder, so a step may leave a field half-shaped as
 * long as the next step (or the coercer) can read it. Pin the old shape as a
 * literal fixture in a test; do not build it by calling today's helpers, which
 * will have moved on.
 *
 * The import of `coerceRecordData` from `./validate` is deliberate and the
 * cycle with it is benign: `parseEnvelope` calls `migrate` inside a function
 * body, `migrate` calls the coercer inside a function body, and neither module
 * touches the other while it is initialising.
 */

import { SCHEMA_VERSION, type RecordData } from './schema'
import { coerceRecordData } from './validate'

export const MIGRATIONS: ReadonlyArray<(data: unknown) => unknown> = []

/**
 * Runs every step from `from` up to SCHEMA_VERSION, then coerces once.
 *
 * `from` is clamped at 1 and a `from` above SCHEMA_VERSION runs no step: the
 * ladder is forward-only and never invents a downgrade. A payload from the
 * future is quarantined by `parseEnvelope` long before it reaches here.
 */
export function migrate(data: unknown, from: number): RecordData {
  let out = data
  const start = Number.isInteger(from) ? Math.max(1, from) : 1
  for (let version = start; version < SCHEMA_VERSION; version += 1) {
    const step = MIGRATIONS[version - 1]
    if (!step) break
    out = step(out)
  }
  return coerceRecordData(out)
}
