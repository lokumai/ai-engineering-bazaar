import { ApiIndex, BUNDLE_MAJOR } from '@/lib/bundle/schema'

/**
 * `api/index.json`: the bundle majors this site serves, so a reader built
 * against one major can tell whether the site still carries it (spec 2.8).
 */

export const dynamic = 'force-static'

export function GET(): Response {
  return Response.json(ApiIndex.parse({ majors: [BUNDLE_MAJOR] }))
}
