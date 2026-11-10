import { buildStoryDoc } from '@/lib/bundle/build'
import { StoryDoc } from '@/lib/bundle/schema'

/** `api/v1/story/en.json`: the About page's story, `mini-courses/STORY.md`, for the native reader (D125). */

export const dynamic = 'force-static'

export function GET(): Response {
  return Response.json(StoryDoc.parse(buildStoryDoc()))
}
