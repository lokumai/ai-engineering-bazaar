import { buildTokens } from '@/lib/bundle/build'
import { Tokens } from '@/lib/bundle/schema'

/** `api/v1/tokens.json`: both themes' design tokens, resolved (spec 2.10). */

export const dynamic = 'force-static'

export function GET(): Response {
  return Response.json(Tokens.parse(buildTokens()))
}
