'use client'

import { useState } from 'react'
import { parseCommit, parseRepo } from '@/lib/identity/github'
import { countGraphemes } from '@/lib/identity/name'
import { addSubmittal, removeSubmittal } from '@/lib/record/events'
import { MAX_SUBMITTALS, type Submittal as SubmittalRecord } from '@/lib/record/schema'
import { nowIso, update, useRecord } from '@/lib/record/store'

/**
 * §12.9 — the `SUBMITTAL` register.
 *
 * In drafting terms a submittal is the thing you hand in against a drawing, and
 * this is **the strongest evidence this system will ever hold**: the only
 * content in the record a third party can independently check. Everything else
 * on the sheet is the reader's own assertion about the reader.
 *
 * **The link is reconstructed, never echoed** (§12.9.2). `parseRepo` returns
 * `https://github.com/{owner}/{repo}` built from two validated path segments,
 * and that string is both the `href` and the visible label. A query string,
 * userinfo (`https://github.com@evil.example/`), a non-default port or a
 * unicode homograph host therefore has no route to the `href` at all, and a
 * link whose text lies about its destination becomes impossible rather than
 * merely unlikely. `rel="noopener noreferrer"` and `target="_blank"` per
 * §12.9.2.
 *
 * **The commit hash is reader-supplied and never fetched** (§12.9.3), and the
 * entry says so beside it. That moves verification to the party who actually
 * has a network: a SHA is a content hash, so a reviewer can resolve
 * `{repo}/commit/{sha}` and read the authored date, the diff and the signature
 * status for themselves. It is the cheapest thing in this slice that raises the
 * record from "self-reported" to "checkable".
 *
 * Up to three per sheet. An empty register is a hairline slot stating that it
 * is empty (§12.9.1) — never a nag, and never a prompt dressed as a task.
 */

/** §12.1.3 — a one-line note, capped in graphemes rather than UTF-16 units. */
const MAX_NOTE_GRAPHEMES = 200

type Field = 'repo' | 'commit'

/**
 * One registered entry.
 *
 * Exported because it is the only part of this component whose output depends
 * on data the first frame cannot have, and therefore the only part a
 * `renderToStaticMarkup` test can reach: §12.9.2's rule is that the visible
 * label and the `href` are the same reconstructed string, and that is worth
 * pinning against a real reducer output rather than against a hand-typed URL.
 */
export function SubmittalEntry({
  entry,
  slug,
  index,
}: {
  entry: SubmittalRecord
  slug: string
  index: number
}) {
  return (
    <li className="hl-submittal-item">
      <div className="min-w-0 flex-1">
        {/* The reconstructed URL, in full and unshortened, as both the href and
            the label — it has to survive being printed, and a label that could
            differ from its own destination is the thing §12.9.2 removes. */}
        <a
          className="hl-submittal-repo"
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {entry.url}
        </a>
        {entry.note !== '' && <p className="hl-submittal-note">{entry.note}</p>}
        {entry.commit !== null && (
          <p className="hl-submittal-commit">
            {`COMMIT ${entry.commit}`}
            <span className="ml-2 font-display tracking-normal normal-case">
              supplied by reader; not fetched or verified by this application
            </span>
          </p>
        )}
      </div>
      <button
        type="button"
        className="hl-btn hl-no-print"
        aria-label={`Remove ${entry.url}`}
        onClick={() => update((data) => removeSubmittal(data, slug, index))}
      >
        REMOVE
      </button>
    </li>
  )
}

export function Submittal({ slug }: { slug: string }) {
  const record = useRecord()
  const [repo, setRepo] = useState('')
  const [commit, setCommit] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<{ field: Field; message: string } | null>(null)

  const submittals = record.sheets[slug]?.submittals ?? []
  const full = submittals.length >= MAX_SUBMITTALS

  const key = slug.replace(/[^A-Za-z0-9]+/g, '-')
  const headId = `hl-submittal-${key}`
  const repoHintId = `${headId}-repo-hint`
  const errorId = `${headId}-error`

  function clear(field: Field): void {
    if (error?.field === field) setError(null)
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    // §12.9.2 — an allowlist over the parsed URL, never a regex over the raw
    // string, and it runs on submit only (§12.3.3).
    const parsed = parseRepo(repo)
    if (parsed === null) {
      setError({ field: 'repo', message: 'Enter the repository as https://github.com/owner/name' })
      return
    }

    const taken = `${parsed.owner}/${parsed.repo}`.toLowerCase()
    if (submittals.some((entry) => `${entry.owner}/${entry.repo}`.toLowerCase() === taken)) {
      // The reducer would drop this silently. A form that clears itself and
      // records nothing is the page telling the reader something untrue.
      setError({ field: 'repo', message: 'This repository is already registered against this sheet' })
      return
    }

    const typed = commit.trim()
    const hash = typed === '' ? null : parseCommit(typed)
    if (typed !== '' && hash === null) {
      setError({ field: 'commit', message: 'Enter the commit as 7 to 40 hexadecimal characters' })
      return
    }

    update((data) =>
      addSubmittal(
        data,
        slug,
        { owner: parsed.owner, repo: parsed.repo, url: parsed.url, commit: hash, note: note.trim(), at: '' },
        nowIso(),
      ),
    )
    setRepo('')
    setCommit('')
    setNote('')
    setError(null)
  }

  return (
    <section className="hl-submittal" aria-labelledby={headId}>
      <div className="hl-submittal-head hl-mark">
        <h2 id={headId} className="m-0 font-medium">
          SUBMITTAL — REGISTER WHAT YOU BUILT
        </h2>
        <span>{`${submittals.length} OF ${MAX_SUBMITTALS}`}</span>
      </div>

      {submittals.length === 0 ? (
        <p className="hl-submittal-empty hl-mark">NO SUBMITTAL REGISTERED</p>
      ) : (
        <ul className="hl-submittal-list">
          {submittals.map((entry, index) => (
            <SubmittalEntry key={entry.url} entry={entry} slug={slug} index={index} />
          ))}
        </ul>
      )}

      {full ? (
        <p className="font-display text-meta text-ink-muted">
          {/* The number is the constant, never a word typed beside it (§11.25). */}
          {`The register holds ${MAX_SUBMITTALS} entries. Remove one to add another.`}
        </p>
      ) : (
        // `noValidate`: the UA's own bubble for a rejected `type="url"` says
        // "Please enter a URL", and §12.14.1 bans "please" from this site's
        // copy — including copy the browser writes on its behalf. The field is
        // a text field for the same reason, and because §12.9.2 accepts the
        // scp-style `git@github.com:owner/repo.git`, which is not a URL.
        <form className="hl-submittal-form" onSubmit={onSubmit} noValidate>
          {/* The hint sits OUTSIDE the label. An implicit label names its
              control from its whole text content, so a hint inside it would
              read the example URL out as part of the field's name. */}
          <div>
            <label className="hl-field" data-invalid={error?.field === 'repo' ? 'true' : 'false'}>
              <span className="hl-field-label">Repository</span>
              <input
                type="text"
                inputMode="url"
                value={repo}
                onChange={(event) => {
                  setRepo(event.target.value)
                  clear('repo')
                }}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-describedby={
                  error?.field === 'repo' ? `${repoHintId} ${errorId}` : repoHintId
                }
              />
            </label>
            {/* record.css gives the hint a top margin, which an inline box
                would drop on the floor. */}
            <span className="hl-field-hint block" id={repoHintId}>
              https://github.com/owner/name
            </span>
          </div>

          <label className="hl-field" data-invalid={error?.field === 'commit' ? 'true' : 'false'}>
            <span className="hl-field-label">
              Commit
              <span className="hl-field-optional">Optional</span>
            </span>
            <input
              type="text"
              value={commit}
              onChange={(event) => {
                setCommit(event.target.value)
                clear('commit')
              }}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-describedby={error?.field === 'commit' ? errorId : undefined}
            />
          </label>

          <label className="hl-field">
            <span className="hl-field-label">
              What you built
              <span className="hl-field-optional">Optional</span>
            </span>
            <input
              type="text"
              value={note}
              onChange={(event) => {
                const next = event.target.value
                // Graphemes, not `.length`: the cap must mean the same thing in
                // every script the reader might write in (§12.3.4).
                if (countGraphemes(next) > MAX_NOTE_GRAPHEMES) return
                setNote(next)
              }}
              dir="auto"
            />
          </label>

          {error !== null && (
            <p className="hl-field-error" id={errorId} role="alert">
              {error.message}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className="hl-btn">
              REGISTER
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
