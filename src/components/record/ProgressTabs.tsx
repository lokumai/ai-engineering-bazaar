'use client'

import { useState } from 'react'
import { signedCount, type CurriculumFacts } from '@/lib/record/derive'
import { trackView } from '@/lib/record/schema'
import { useHydrated, useRecord } from '@/lib/record/store'
import { TRACKS, type Track } from '@/lib/tracks'

const NO_READING = '--'

/**
 * M39 F2 — the progress page's two tabs, one per track, each with its count.
 *
 * Both panels are server-rendered; which one shows in frame one is drawn by
 * `progress.css` from `data-bz-track` on `<html>` (the track the bar shows),
 * so the page opens on the track the reader is reading in. A click sets
 * `data-tab` on the tab set, which overrides it. The tabs only change the view;
 * they do not switch the reader's track. The counts are tallies, so they are
 * channel B and print `--` until the store has answered.
 */
export function ProgressTabs({
  facts,
  panels,
}: {
  facts: Readonly<Record<Track, CurriculumFacts>>
  panels: Readonly<Record<Track, React.ReactNode>>
}) {
  const record = useRecord()
  const hydrated = useHydrated()
  const [chosen, setChosen] = useState<Track | null>(null)
  const shown: Track = chosen ?? (hydrated ? record.prefs.track : null) ?? 'engineers'

  return (
    <div className="bz-ptabs" data-tab={chosen ?? undefined}>
      <div role="tablist" aria-label="Track" className="bz-ptabs-list">
        {TRACKS.map((track) => {
          const counts = signedCount(trackView(record, track.id), facts[track.id])
          return (
            <button
              key={track.id}
              type="button"
              role="tab"
              id={`bz-ptab-${track.id}`}
              aria-controls={`bz-ppanel-${track.id}`}
              aria-selected={shown === track.id}
              data-track-id={track.id}
              className="bz-ptab"
              onClick={() => setChosen(track.id)}
            >
              {track.label}
              <span className="bz-ptab-count">
                {hydrated ? counts.signed : NO_READING} of {facts[track.id].sheets.length}
              </span>
            </button>
          )
        })}
      </div>
      {TRACKS.map((track) => (
        <div
          key={track.id}
          role="tabpanel"
          id={`bz-ppanel-${track.id}`}
          aria-labelledby={`bz-ptab-${track.id}`}
          data-panel={track.id}
          className="bz-ptab-panel"
        >
          {panels[track.id]}
        </div>
      ))}
    </div>
  )
}
