import { buildIndexDraft } from '@/lib/bundle/build'
import { diagramFont, diagramRenderConfig, diagramThemes } from '@/lib/bundle/diagrams'
import { IndexDraft } from '@/lib/bundle/schema'
import { headCommitDate } from '@/lib/content/revision'

/**
 * `api/v1/index.draft.json`: the index with its hashes empty, plus the
 * diagrams to draw and the config to draw them with (spec 2.5). The postbuild
 * finaliser completes it into `api/v1/index.json` and deletes it, so it never
 * reaches a published site.
 */

export const dynamic = 'force-static'

export async function GET(): Promise<Response> {
  return Response.json(IndexDraft.parse(await buildIndexDraft({
    publishedAt: headCommitDate(),
    diagramFont: diagramFont(),
    diagramThemes: diagramThemes(),
    render: { light: diagramRenderConfig('light'), dark: diagramRenderConfig('dark') },
  })))
}
