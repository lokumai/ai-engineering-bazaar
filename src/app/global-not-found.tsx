import { NOT_FOUND_METADATA, NotFoundPage } from '@/components/shell/NotFoundPage'
import { RootShell, shellMetadata } from '@/components/shell/RootShell'
import { SITE_NAME } from '@/lib/site'

/**
 * `404.html`: the page GitHub Pages serves at every address the export did not build.
 *
 * Next skips the layouts for an unmatched URL, and with three root layouts there is
 * no one of them to compose it from (`(en)`, `tr`, `fa`), so this is the page's own
 * document: the same shell the English tree wears, with the same 404 inside it.
 * It needs \`experimental.globalNotFound\` in \`next.config.mjs\`.
 */
export const metadata = {
  ...shellMetadata,
  title: `${NOT_FOUND_METADATA.title} · ${SITE_NAME}`,
}

export default function GlobalNotFound() {
  return (
    <RootShell lang="en">
      <NotFoundPage />
    </RootShell>
  )
}
