import { monthRange } from '@/lib/caravan-months'
import type { CaravanInput, CaravanLink } from '@/lib/content/caravan'

/**
 * M91, D116 — PLACEHOLDER, NOT CONTENT. Delete this file when the first real trend lands in
 * `mini-courses/caravan/trends.yaml`.
 *
 * The Caravan page is built before its content exists, so the author can see the design (C4,
 * Shadow Play) with something on the road. This is that something: the round-5 mockup's sample
 * trends (`playground/2026-11-round-5/C1-caravan-designs.html`), cut to the high-level ones and
 * reshaped into format 2. **Nothing here was researched, measured or checked**, and the page says
 * so on its notice and on every trend.
 *
 * Why it lives in `src/` and not in `mini-courses/`: anything in `mini-courses/` is the author's
 * content and is published as his. A sample written by an agent in his folder would sit there
 * looking like a draft of his, which is exactly what `mini-courses/STORY.md` rules out ("No AI was
 * allowed to write our content."). Here it is code, it is drawn only while his file is empty, and
 * removing it is deleting one file and one import.
 *
 * What is deliberately not real:
 * - **No external link has an address.** A sample source would be a claim nobody verified
 *   (MANIFESTO rule 13), so each group shows a placeholder title as plain text.
 * - **The strength is a shape, not a measurement**: each trend rises and falls over its span to a
 *   placeholder peak, the way the mockup drew it.
 * - **Module links are real**, because they are derived from `curriculum.yaml`, and a name that no
 *   longer resolves is dropped here rather than failing the build: a placeholder must never turn a
 *   module rename red.
 */

type Row = [id: string, start: string, end: string | null, title: string, text: string, peak: number, modules: string[], kinds: ('articles' | 'videos' | 'tools' | 'repositories')[]]

const ROWS: readonly Row[] = [
  ['chatbot_moment', '2022-11', '2023-02', 'The chatbot moment', 'A chat window on a language model reached everyone, and talking to a model became ordinary.', 5, ['llms'], ['articles', 'videos']],
  ['prompt_craft', '2022-12', '2023-06', 'Prompt craft', 'People traded tricks for wording requests, and prompt engineer became a job title.', 3, ['prompt_engineering'], ['articles']],
  ['open_weights', '2023-02', '2023-09', 'Open weights spread', 'Model weights anyone could download began to circulate, and a wave of fine-tunes followed.', 4, ['training'], ['articles', 'repositories']],
  ['agents_loop', '2023-04', '2023-06', 'Agents that set their own tasks', 'Loops that let a model choose its next step topped GitHub and promised to run on their own.', 4, ['agents'], ['repositories']],
  ['retrieval', '2023-04', '2024-03', 'Chat with your documents', 'Retrieval became the usual way to give a model private knowledge, with vector stores everywhere.', 4, ['rag'], ['articles', 'tools']],
  ['gpu_rush', '2023-05', '2024-08', 'The GPU rush', 'Demand for chips to train and serve models became the industry story.', 3, ['inference_providers'], ['articles']],
  ['tool_calling', '2023-06', '2023-12', 'Models call tools', 'Models learned to answer with a structured call to a function a developer describes.', 3, ['tools'], ['articles']],
  ['multimodal', '2023-12', '2024-06', 'Models that see and speak', 'Images, audio and voice became ordinary inputs and outputs of the same model.', 3, ['llms'], ['articles', 'videos']],
  ['long_context', '2024-02', '2024-06', 'Very long context', 'Context windows grew large enough to hold whole codebases and books.', 3, ['context_engineering'], ['articles']],
  ['coding_agents', '2024-03', '2024-07', 'Software engineer agents', 'Demos of agents that plan and write code in their own environment spread widely.', 4, ['coding_agents'], ['videos', 'repositories']],
  ['editor_model', '2024-06', '2024-12', 'A model in the editor', 'Writing code beside a model inside the editor became a common way to work.', 3, ['coding_agents'], ['tools']],
  ['reasoning', '2024-09', '2025-03', 'Models that think first', 'Models began to spend longer before answering, and test-time compute became a topic.', 5, ['advanced_llm'], ['articles']],
  ['computer_use', '2024-10', '2025-04', 'Agents at the screen', 'Models began to operate a desktop or a browser by reading the screen and clicking.', 3, ['agents_in_practice'], ['articles', 'videos']],
  ['protocols', '2024-11', '2025-07', 'Protocols like MCP', 'An open protocol for connecting models to tools and data spread across labs and editors.', 5, ['protocols_reference'], ['articles', 'repositories']],
  ['vibe_coding', '2025-02', '2025-08', 'Vibe coding', 'A name for building software by describing it to a model spread fast, with its joys and its messes.', 4, ['coding_agents'], ['articles']],
  ['agentic_coding', '2025-03', '2026-01', 'The agentic coding wave', 'Agents in the terminal and in the cloud took whole tasks, ran the tests and opened pull requests.', 5, ['harness_engineering'], ['tools', 'articles']],
  ['context_engineering', '2025-06', '2025-12', 'Context engineering', 'The craft moved from wording a prompt to deciding what goes into the context.', 4, ['context_engineering'], ['articles']],
  ['skills_harnesses', '2025-10', '2026-04', 'Skills and harnesses', 'Folders of instructions and scripts an agent loads when a task needs them, and the harness around the loop.', 3, ['harness_engineering'], ['repositories']],
  ['personal_agents', '2026-01', '2026-05', 'Personal agents', 'Self-hosted agents that live in chat apps and run errands topped GitHub trends.', 5, ['personal_agents'], ['repositories']],
  ['long_loops', '2026-03', '2026-08', 'Long-running loops', 'Agents ran for hours on one task, with checks between rounds.', 3, ['loop_engineering'], ['articles']],
  ['injection', '2026-05', '2026-10', 'Injection through the inbox', 'Prompt injection through tools, pages and email became a regular headline.', 3, ['security'], ['articles']],
  ['agentic_ui', '2026-07', null, 'Agents that draw interface', 'Agents began answering with interface instead of a wall of text.', 2, ['ui'], ['articles', 'videos']],
]

const FIRST = '2022-11'
const THROUGH = '2026-11'

const PLACEHOLDER: Readonly<Record<Row[7][number], string>> = {
  articles: 'Sample article',
  videos: 'Sample video',
  tools: 'Sample tool',
  repositories: 'Sample repository',
}

/** A rise and a fall over the span, to a placeholder peak: a shape, never a measurement. */
function shape(start: string, end: string, peak: number): Record<string, number> {
  const months = monthRange(start, end)
  const span = months.length
  return Object.fromEntries(months.map((month, k) => [
    month,
    Math.max(1, Math.round(peak * Math.pow(Math.sin((Math.PI * (k + 0.5)) / span), 0.7))),
  ]))
}

/** The sample as page input. `modules` resolves a module name to its link, or null when it is gone. */
export function sampleInput(modules: (name: string) => CaravanLink | null): CaravanInput {
  return {
    sample: true,
    firstMonth: FIRST,
    through: THROUGH,
    trends: ROWS.map(([id, start, end, title, text, peak, names, kinds]) => ({
      id,
      title,
      start,
      end,
      text,
      groups: {
        ...Object.fromEntries(kinds.map((kind) => [kind, [{ title: PLACEHOLDER[kind], href: null }]])),
        modules: names.map(modules).filter((link): link is CaravanLink => link !== null),
      },
      strength: shape(start, end ?? THROUGH, peak),
    })),
  }
}
