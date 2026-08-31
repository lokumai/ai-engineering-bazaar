'use client'

import { useEffect } from 'react'
import { type StampFacts, stampRecordState } from '@/lib/record/stamp'
import { snapshot, subscribe } from '@/lib/record/store'

/**
 * §12.2 Channel A, after first paint.
 *
 * The boot script in `<head>` stamps `<html>` before the first frame; this keeps
 * those stamps true for the rest of the session. Both are needed and neither
 * replaces the other: without the script the mascot flickers through a frame of
 * "nothing signed off" on every load, and without this it freezes at whatever
 * was true when the document loaded — and since every navigation here is a
 * client transition, that is the entire session.
 *
 * It renders `null` and holds no state, which is the DOM-enhancement pattern
 * `shell/Affordances.tsx` establishes. It subscribes to the store directly
 * rather than through `useRecord`, because there is no render to re-run: the
 * work is one attribute pass on one element.
 *
 * The two build-time maps arrive as props from the root layout, which already
 * measures them for the boot script. They cannot be imported here — the module
 * that measures them reaches `node:fs`, and a client component importing it
 * stops the build (§12.2).
 */
export function RecordStateSync({ facts }: { facts: StampFacts }) {
  useEffect(() => {
    const root = document.documentElement

    function apply(): void {
      stampRecordState(root, snapshot(), facts)
    }

    // Once on mount as well as on every change: the boot script may have been
    // unable to read storage at all, and another tab may have written since.
    apply()
    return subscribe(apply)
  }, [facts])

  return null
}
