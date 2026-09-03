/**
 * §15.5.2 — the sign-in comparison table, as data, in one module.
 *
 * `/sign-in/` offers four ways to read this site: no name at all, a local
 * alias, an emailed link, GitHub. The page's spine is a table of what each one
 * actually costs and buys, because a reader cannot infer a consequence from
 * button copy — and §15.5.2's point is that the table is the part most likely
 * to go quietly false. Hand-written in JSX it would be a set of behaviour
 * claims nothing checks: `0005` moved the join guard from one JWT field to
 * another and a table three files away would have gone on saying what `0004`
 * did. So the claims live here, each one traceable to the code that makes it,
 * and `tests/unit/auth/doors.test.ts` holds them still.
 *
 * **Every cell is a member of `Answer`, never a free string.** A renderer that
 * could write its own cell text is a second author of the same claim, which is
 * the arrangement §1 forbids; with a three-member union, the only thing a
 * renderer can decide is styling. `ANSWER_WORDS` gives it the word to print, so
 * a cell reads the same in the table, in a caption and under `forced-colors`
 * where the tint is gone (§2.6 — colour is never the only signal).
 *
 * **This module reaches no `node:fs` and imports nothing from
 * `lib/content/`.** It has no imports at all. `/sign-in/` renders it on the
 * server, but §15.4's alias screen is a client island that must stay free of
 * the corpus loader (§12.2), and a table of what the doors do is exactly the
 * kind of thing that screen may want to quote.
 *
 * ## Where each column's answer comes from
 *
 * Read against the code rather than the mockup, and two cells came out
 * differently from Rev B of the drawing; both are recorded on the cell.
 *
 *   * **Kept in this browser** — `record/store.ts` writes `localStorage` on
 *     every mutation regardless of session, and §14.7.3's rule is that a local
 *     write never waits for the network. `yes` on all four rows, including the
 *     two account rows: an account adds a copy, it does not move the record.
 *   * **Survives this browser** — whether a copy exists off the device.
 *     `record_state` is keyed by `auth.uid()` (`0002`, policy `own record`), so
 *     only the two account rows have one. The exported file is not this: it is
 *     a document the reader saves by hand, not the record following them.
 *   * **Managers can read it** — `0002`'s `manager reads the org's records`,
 *     which is `for select` and joins through `memberships`. It is not `yes`
 *     and not `no`: it is scoped to organisations this reader has joined, and
 *     `in-your-orgs` is the third answer that difference needs (§11.25).
 *   * **Verified submittal** — `classifySubmittals` (`lib/org/types.ts`)
 *     compares each submittal's owner against `profiles.github_login`, and
 *     `profileRowFor` writes that column only from a GitHub identity. A
 *     magic-link account therefore reads `unattributable` — the honest "cannot
 *     be checked" — so the email row is `no`, not `yes`.
 *   * **Join by domain** — both `memberships` insert policies in `0005`
 *     require `app_metadata.providers ? 'email'`, which with autoconfirm off
 *     means somebody opened the mailbox. §14.14.5 measured what that costs: a
 *     GitHub identity carries no proven mailbox, so the GitHub row is `no`.
 *   * **Needs a proven mailbox** — the same clause read as a price rather than
 *     a capability, which is the shape of the reader's actual question: what
 *     will this door ask of me.
 */

/**
 * The rows, in §15.5.1's order.
 *
 * **`google` was missing, and its absence was reachable.**
 * `SIGN_IN_PROVIDERS` carries three provider buttons, `SignInPanel` renders the
 * Google one whenever `available.google` is true, and `ALL_PROVIDERS` — which
 * sets it true — is the FALLBACK when the settings probe cannot be read. So a
 * deployment with an unreadable probe offered a third account door on a page
 * whose heading said there were two and whose table explained the consequences
 * of the other two only. The count is now derived from `needsAccount` below and
 * `tests/unit/auth/doors.test.ts` binds this union to `SIGN_IN_PROVIDERS`, so a
 * provider cannot be added to the panel without a row here.
 *
 * `google` sits beside `github` rather than after `emailLink`, because it is the
 * same door at the same price minus the one thing GitHub brings.
 */
export type DoorId = 'none' | 'alias' | 'emailLink' | 'github' | 'google'

/** The six columns. Each one is a consequence a reader can act on. */
export type ConsequenceId =
  | 'keptInThisBrowser'
  | 'survivesThisBrowser'
  | 'managersCanRead'
  | 'verifiedSubmittal'
  | 'joinByDomain'
  | 'needsProvenMailbox'

/**
 * What a cell may say.
 *
 * `in-your-orgs` earns its place for the reason `SubmittalEvidence` needed a
 * third value: a manager's read is neither universal nor absent, and answering
 * `yes` would overstate it while `no` would deny the disclosure §14.5.1 makes
 * the reader agree to.
 *
 * **The plan's fourth member, `by-code`, is deliberately absent.** It described
 * a GitHub account joining an organisation with a code, and there is no such
 * thing in this schema: §14.0's decision 11 rules out an invite token, and
 * `0005`'s invite policy asks for the same email identity the domain policy
 * does. Shipping the value would have put a door on the table that the database
 * does not open. The way in for an OAuth-only account is to link an email
 * identity and prove the mailbox like everybody else, which is a sentence for
 * the door's own paragraph (§15.5.3), not a cell.
 */
export type Answer = 'yes' | 'no' | 'in-your-orgs'

/**
 * The word each answer prints. Held here so the table, any caption and a
 * screen reader all say it the same way, and so a tint is never carrying the
 * meaning on its own.
 */
export const ANSWER_WORDS: Readonly<Record<Answer, string>> = Object.freeze({
  yes: 'Yes',
  no: 'No',
  'in-your-orgs': 'In your orgs',
})

/** One column: the heading, and the question it answers in full. */
export interface Consequence {
  id: ConsequenceId
  /** The column heading, short enough to read across six of them. */
  heading: string
  /**
   * The same column as a question. A heading of three words is ambiguous on
   * its own — `Join by domain` reads as an action rather than a capability —
   * and this is what a caption, a tooltip or a narrow layout prints instead.
   */
  question: string
}

/**
 * The columns, in reading order: what is true here, what survives, who else
 * sees it, what it proves, what it opens, what it asks for. The order is a
 * sequence from the reader outwards, so the two columns about other people
 * sit together rather than either side of a capability.
 */
export const DOOR_CONSEQUENCES: readonly Consequence[] = Object.freeze([
  Object.freeze({
    id: 'keptInThisBrowser' as const,
    heading: 'Kept in this browser',
    question: 'Is the record kept in this browser?',
  }),
  Object.freeze({
    id: 'survivesThisBrowser' as const,
    heading: 'Survives this browser',
    question: 'Is there a copy that outlives a cleared cache?',
  }),
  Object.freeze({
    id: 'managersCanRead' as const,
    heading: 'Managers can read it',
    question: 'Who else can read the record?',
  }),
  Object.freeze({
    id: 'verifiedSubmittal' as const,
    heading: 'Verified submittal',
    question: 'Can a submittal be shown as verified rather than typed?',
  }),
  Object.freeze({
    id: 'joinByDomain' as const,
    heading: 'Join by domain',
    question: 'Can this door join an organisation by its email domain?',
  }),
  Object.freeze({
    id: 'needsProvenMailbox' as const,
    heading: 'Needs a proven mailbox',
    question: 'Does this door ask you to open a mailbox?',
  }),
])

/**
 * One row: the door, and its six answers.
 *
 * `cells` is a total `Record`, so adding a seventh consequence is a type error
 * in four places rather than four blank cells on a table that still renders.
 */
export interface DoorRow {
  id: DoorId
  /** The row heading, as the table's leftmost cell prints it. */
  label: string
  /**
   * Whether this door creates an account.
   *
   * A field and not a list of ids elsewhere, so the count on `/sign-in/` and
   * the count in the alias island's link both come from the rows themselves.
   * The heading used to type the number, and it was wrong the moment a third
   * account door became reachable.
   */
  needsAccount: boolean
  cells: Readonly<Record<ConsequenceId, Answer>>
}

/**
 * The table.
 *
 * `none` and `alias` answer identically, and that is the row worth having
 * rather than a duplicate to collapse. An alias is a label on a record, not
 * authentication (§15.4): it buys a name on an export and nothing else, and a
 * reader comparing it against no name at all can only see that here. Merging
 * them would leave the page implying the alias sits somewhere between reading
 * anonymously and holding an account.
 */
export const DOOR_ROWS: readonly DoorRow[] = Object.freeze([
  Object.freeze({
    id: 'none' as const,
    label: 'No name',
    needsAccount: false,
    cells: Object.freeze({
      keptInThisBrowser: 'yes' as const,
      survivesThisBrowser: 'no' as const,
      managersCanRead: 'no' as const,
      verifiedSubmittal: 'no' as const,
      joinByDomain: 'no' as const,
      needsProvenMailbox: 'no' as const,
    }),
  }),
  Object.freeze({
    id: 'alias' as const,
    label: 'Alias',
    needsAccount: false,
    cells: Object.freeze({
      keptInThisBrowser: 'yes' as const,
      survivesThisBrowser: 'no' as const,
      managersCanRead: 'no' as const,
      verifiedSubmittal: 'no' as const,
      joinByDomain: 'no' as const,
      needsProvenMailbox: 'no' as const,
    }),
  }),
  Object.freeze({
    id: 'emailLink' as const,
    label: 'Email link',
    needsAccount: true,
    cells: Object.freeze({
      keptInThisBrowser: 'yes' as const,
      survivesThisBrowser: 'yes' as const,
      managersCanRead: 'in-your-orgs' as const,
      verifiedSubmittal: 'no' as const,
      joinByDomain: 'yes' as const,
      needsProvenMailbox: 'yes' as const,
    }),
  }),
  Object.freeze({
    id: 'github' as const,
    label: 'GitHub',
    needsAccount: true,
    cells: Object.freeze({
      keptInThisBrowser: 'yes' as const,
      survivesThisBrowser: 'yes' as const,
      managersCanRead: 'in-your-orgs' as const,
      verifiedSubmittal: 'yes' as const,
      joinByDomain: 'no' as const,
      needsProvenMailbox: 'no' as const,
    }),
  }),
  /**
   * The row that was missing.
   *
   * Identical to GitHub except the one column GitHub exists for.
   * `githubLoginOf` (`lib/auth/session.ts`) finds the identity whose provider
   * is literally `github`, and `profileRowFor` writes `profiles.github_login`
   * from nothing else, so a Google account leaves that column null and
   * `classifySubmittals` reads its submittals as `unattributable` — the same
   * `no` the email row gets, for the same reason.
   *
   * `joinByDomain` is `no` and `needsProvenMailbox` is `no` for the reason the
   * GitHub row carries: `0005` asks for `app_metadata.providers ? 'email'`, and
   * an OAuth provider is not that clause however well it knows the address.
   */
  Object.freeze({
    id: 'google' as const,
    label: 'Google',
    needsAccount: true,
    cells: Object.freeze({
      keptInThisBrowser: 'yes' as const,
      survivesThisBrowser: 'yes' as const,
      managersCanRead: 'in-your-orgs' as const,
      verifiedSubmittal: 'no' as const,
      joinByDomain: 'no' as const,
      needsProvenMailbox: 'no' as const,
    }),
  }),
])

/** How many doors create an account. Counted, so no heading types it. */
export const ACCOUNT_DOOR_COUNT = DOOR_ROWS.filter((row) => row.needsAccount).length

/** The row for one door, or `undefined` for an id no table row covers. */
export function doorRow(id: DoorId): DoorRow | undefined {
  return DOOR_ROWS.find((row) => row.id === id)
}
