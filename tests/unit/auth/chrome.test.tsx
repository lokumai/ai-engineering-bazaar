import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { SessionContextValue } from '@/components/auth/SessionProvider'
import type { SessionUser, SessionView } from '@/lib/auth/session'

/**
 * §16.1.1 — `chrome`, over every state both auth panels can be in.
 *
 * **Why this file exists at all.** §16.9's first risk is that adding a variant
 * to `SignInPanel` breaks one of the states it renders: there are four
 * `SessionView` statuses and five shapes, `unknown` is never collapsed into
 * `signedOut`, and the only reason the drafter block may render the shipped
 * panel instead of a second sign-in form is that the variant is confined to the
 * wrapper and the heading. That confinement is not readable from the diff — the
 * `chrome === 'panel' &&` guards are scattered through three branches — so it is
 * measured here instead, once per state.
 *
 * **The central assertion is a subsequence, and that is the point.** For every
 * state, the inline markup is a character-for-character subsequence of the panel
 * markup with the `hl-panel` wrapper stripped off. A subsequence can only be
 * reached by DELETING: `chrome="inline"` cannot rename a class, move an
 * attribute, reorder two elements or add a wrapper of its own without failing
 * it. That is the strongest available reading of "`panel` is byte-for-byte the
 * behaviour shipped today" in a suite with no DOM and no second copy of the
 * component to compare against — and it is stronger than a list of expected
 * strings, which would pass over an inline branch that quietly added a `<div>`.
 *
 * **What may be deleted is enumerated** (`PANEL_ONLY`), so the confinement is
 * checkable in the other direction too: the difference between the two chromes
 * is the section, the `h2`, and the cross-references that point at `/profile/`
 * from a panel that, in inline chrome, is already on `/profile/`.
 *
 * `renderToStaticMarkup` and a mocked session, for the reason
 * `record-profile.test.tsx` records: there is no jsdom here, so nothing pretends
 * to have a layout or a `document`. The session is the one thing these panels
 * read that a static render cannot reach, so it is supplied rather than
 * simulated — the effects inside them never run, which is exactly the first
 * frame every reader sees.
 */

/**
 * Mutable so one mocked module can serve every state: `vi.mock` is hoisted and
 * the factory runs once, so the view has to be reachable through a box the
 * tests can write to rather than closed over per-case.
 */
const current: { view: SessionView; error: string | null } = {
  view: { status: 'unknown' },
  error: null,
}

vi.mock('@/components/auth/SessionProvider', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  useSession: (): SessionContextValue => ({
    view: current.view,
    error: current.error,
    signOut: async () => {},
    refresh: async () => {},
  }),
}))

const { AuthShell, SignInPanel } = await import('@/components/auth/SignInPanel')
const { AccountPanel, AuthPanels, OrgMembershipPanel } = await import(
  '@/components/auth/AuthPanels'
)

function user(over: Partial<SessionUser>): SessionUser {
  return {
    id: 'a1b2c3d4-0000-0000-0000-000000000000',
    email: null,
    githubLogin: null,
    provider: null,
    providers: [],
    ...over,
  }
}

/**
 * Every `SessionView` a panel can be handed, `unknown` and `disabled` kept
 * apart from `signedOut` because the component keeps them apart (§11.25), and
 * `signedIn` split into the two identities §14.5's `needsMailbox` branch turns
 * on: an account that can be emailed, and one that cannot.
 */
const VIEWS: ReadonlyArray<[string, SessionView]> = [
  ['disabled', { status: 'disabled', why: 'flagOff' }],
  ['unknown', { status: 'unknown' }],
  ['signedOut', { status: 'signedOut' }],
  [
    'signedIn with an email identity',
    {
      status: 'signedIn',
      expiresAt: null,
      user: user({ email: 'ada@example.com', provider: 'email', providers: ['email'] }),
    },
  ],
  [
    'signedIn with no email identity',
    {
      status: 'signedIn',
      expiresAt: null,
      user: user({ githubLogin: 'ada', provider: 'github', providers: ['github'] }),
    },
  ],
]

/** The three panels that take a chrome, and the heading id each one owns. */
const PANELS: ReadonlyArray<[string, (chrome?: 'panel' | 'inline') => React.ReactElement, string]> =
  [
    ['SignInPanel', (chrome) => <SignInPanel chrome={chrome} />, 'hl-signin-state'],
    ['AccountPanel', (chrome) => <AccountPanel chrome={chrome} />, 'hl-account-head'],
    ['OrgMembershipPanel', (chrome) => <OrgMembershipPanel chrome={chrome} />, 'hl-orgs-head'],
  ]

/**
 * The only things `chrome` is allowed to remove from the body, beyond the
 * `hl-panel` wrapper and the heading that `AuthShell` itself drops.
 *
 * Both are `/profile/` cross-references, and inline chrome only ever renders on
 * `/profile/`: a link offering to take the reader to the sheet they are reading
 * is a page saying something untrue about itself.
 */
const PANEL_ONLY = ['/profile/', 'Go to the profile sheet', 'Open the profile sheet']

/**
 * And the wider rule those three are instances of: inline chrome drops the
 * content that talks ABOUT the profile sheet, because inline chrome is what
 * `/profile/` renders. Matched case-insensitively so a sentence-initial `The
 * profile sheet shows whose it is` is caught by the same rule as the link.
 */
const ABOUT_THE_SHEET = /profile sheet/i

/** Panel chrome's wrapper, stripped so what remains is the body both share. */
function bodyOf(panel: string, headingId: string): string {
  const opened = new RegExp(
    `^<section class="hl-panel" aria-labelledby="${headingId}">`
    + `<div class="hl-panel-head"><h2 id="${headingId}" class="hl-panel-title">[^<]*</h2>`,
  )
  expect(panel).toMatch(opened)
  expect(panel.endsWith('</section>')).toBe(true)
  return panel.replace(opened, '').replace(/<\/section>$/, '').replace('</div>', '')
}

/**
 * Is `needle` reachable from `haystack` by deleting characters only? Two
 * pointers, so a passing case proves inline chrome added nothing and moved
 * nothing — see this file's header.
 */
function isSubsequence(needle: string, haystack: string): boolean {
  let at = 0
  for (const char of needle) {
    at = haystack.indexOf(char, at) + 1
    if (at === 0) return false
  }
  return true
}

describe('§16.1.1 — AuthShell: the wrapper and the heading, and nothing else', () => {
  it('emits the section, the head and the heading id in panel chrome', () => {
    const markup = renderToStaticMarkup(
      <AuthShell chrome="panel" headingId="hl-test-head" heading="Heading" mark={<i>MARK</i>}>
        <p>BODY</p>
      </AuthShell>,
    )
    expect(markup).toContain('class="hl-panel"')
    expect(markup).toContain('aria-labelledby="hl-test-head"')
    expect(markup).toContain('<h2 id="hl-test-head" class="hl-panel-title">Heading</h2>')
    expect(markup).toContain('<i>MARK</i>')
    expect(markup).toContain('<p>BODY</p>')
  })

  it('emits the reading and the children alone in inline chrome', () => {
    const markup = renderToStaticMarkup(
      <AuthShell chrome="inline" headingId="hl-test-head" heading="Heading" mark={<i>MARK</i>}>
        <p>BODY</p>
      </AuthShell>,
    )
    // The heading, its id and the wrapper are gone; the reading is not. A
    // reading is a fact about the state (§16.4.1), and only chrome is chrome.
    expect(markup).toBe('<i>MARK</i><p>BODY</p>')
    expect(markup).not.toContain('hl-test-head')
    expect(markup).not.toContain('Heading')
  })
})

describe('§16.1.1 — every session state, in both chromes', () => {
  for (const [panelName, render, headingId] of PANELS) {
    for (const [viewName, view] of VIEWS) {
      it(`${panelName} · ${viewName}`, () => {
        current.view = view
        const panel = renderToStaticMarkup(render('panel'))
        const inline = renderToStaticMarkup(render('inline'))

        // Hazard 2: these three ids are addressed by roughly twenty assertions
        // across the suites and by in-page anchors, and panel chrome is where
        // they still live.
        expect(panel).toContain(`id="${headingId}"`)
        expect(panel).toContain('class="hl-panel"')
        expect(panel).toContain('<h2')

        // Inline chrome emits no heading and no panel: the drafter block's half
        // already carries an `h3`, and a second element carrying the id would
        // make the anchor ambiguous rather than redundant.
        expect(inline).not.toContain('<h2')
        expect(inline).not.toContain('class="hl-panel"')
        expect(inline).not.toContain(headingId)

        // The state itself survives both, whatever it is: neither chrome may
        // render a shape the other does not.
        expect(inline.length).toBeGreaterThan(0)
        expect(isSubsequence(inline, bodyOf(panel, headingId))).toBe(true)
      })
    }
  }

  it('drops the cross-references to /profile/ in inline chrome, and only those', () => {
    for (const [, view] of VIEWS) {
      current.view = view
      const panel = renderToStaticMarkup(<SignInPanel />)
      const inline = renderToStaticMarkup(<SignInPanel chrome="inline" />)
      for (const only of PANEL_ONLY) expect(inline, only).not.toContain(only)

      // Everything panel chrome says that is NOT one of those, inline says too.
      // Sentence-level, because the wrapper's own tags are the other thing that
      // differs and those are asserted structurally above.
      // The `h2`'s own text is chrome by definition — it IS the heading — so it
      // is read off the panel rather than listed, and skipped.
      const heading = (/<h2[^>]*>([^<]*)<\/h2>/.exec(panel) as RegExpExecArray)[1]
      const sentences = panel
        .replace(/<[^>]*>/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 12 && line !== heading)
      for (const sentence of sentences) {
        if (PANEL_ONLY.some((only) => sentence.includes(only))) continue
        if (ABOUT_THE_SHEET.test(sentence)) continue
        expect(inline, sentence).toContain(sentence)
      }
    }
  })
})

describe('§16.1.1 — the state machine is untouched by chrome', () => {
  it('never collapses unknown into signedOut', () => {
    current.view = { status: 'unknown' }
    const unknown = renderToStaticMarkup(<SignInPanel chrome="inline" />)
    current.view = { status: 'signedOut' }
    const signedOut = renderToStaticMarkup(<SignInPanel chrome="inline" />)

    expect(unknown).toContain('CHECKING WHETHER THIS BROWSER IS SIGNED IN')
    // The signed-out shape is the one with the email door in it; the unknown
    // shape has no door at all, because it has established nothing.
    expect(unknown).not.toContain('type="email"')
    expect(signedOut).toContain('type="email"')
    expect(signedOut).not.toContain('CHECKING WHETHER THIS BROWSER IS SIGNED IN')
  })

  it('keeps §14.5’s needsMailbox offer in inline chrome, where /join/ sends the reader', () => {
    current.view = {
      status: 'signedIn',
      expiresAt: null,
      user: user({ githubLogin: 'ada', provider: 'github', providers: ['github'] }),
    }
    const inline = renderToStaticMarkup(<SignInPanel chrome="inline" />)
    expect(inline).toContain('data-hl-needs-mailbox="1"')
    expect(inline).toContain('NO EMAIL SIGN-IN ON THIS ACCOUNT')

    current.view = {
      status: 'signedIn',
      expiresAt: null,
      user: user({ email: 'ada@example.com', provider: 'email', providers: ['email'] }),
    }
    expect(renderToStaticMarkup(<SignInPanel chrome="inline" />)).not.toContain(
      'data-hl-needs-mailbox',
    )
  })

  it('keeps the disabled readout in inline chrome, so H-B’s zero-request sweep holds', () => {
    current.view = { status: 'disabled', why: 'flagOff' }
    const inline = renderToStaticMarkup(<SignInPanel chrome="inline" />)
    expect(inline).toContain('ACCOUNTS NOT ENABLED YET')
    // With no backend there is no door in either chrome, so inline chrome
    // cannot be the thing that puts a provider button on /profile/.
    expect(inline).not.toContain('type="email"')
    expect(inline).not.toContain('<button')
  })
})

describe('§16.1.1 — AuthPanels passes the chrome through rather than fixing it', () => {
  it('carries both heading ids in panel chrome, and neither in inline', () => {
    current.view = { status: 'signedOut' }
    const panel = renderToStaticMarkup(<AuthPanels />)
    expect(panel).toContain('id="hl-account-head"')
    expect(panel).toContain('id="hl-orgs-head"')

    const inline = renderToStaticMarkup(<AuthPanels chrome="inline" />)
    expect(inline).not.toContain('hl-account-head')
    expect(inline).not.toContain('hl-orgs-head')
  })
})
