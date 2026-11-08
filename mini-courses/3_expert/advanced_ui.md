# Advanced Agentic UI

*(Placeholder module: a short overview for now; full lesson content is coming soon.)*

Everything in agentic UI beyond streaming: the human steering the agent mid-run, state shared between the screen and the agent, and interface the agent generates itself. The Agentic UI module covered the base: streaming a run as events, and AG-UI.

**Topics this module will cover**:
- Generative UI: the agent producing the interface itself, not only the text inside it, and the ways to do it, each with its trade-offs
- Shared state: the screen and the agent reading and writing the same application state
- Human in the loop: the agent pausing for approval, steering a run mid-way
- Agentic generative UI: interface generated while the agent runs
- A2UI
- MCP Apps
- OpenUI
- json-render
- CopilotKit
- Agent Client Protocol (ACP)
- TUI for agents

**References to start from**:
- [What is agentic UI?](https://www.copilotkit.ai/learning/what-is-agentic-ui): the concept on its own, before any framework
- [Generative UI](https://www.copilotkit.ai/generative-ui): an interface the agent produces rather than one written in advance, and the ways to build it
- [Generative UI: A rich, custom, visual interactive user experience for any prompt](https://research.google/blog/generative-ui-a-rich-custom-visual-interactive-user-experience-for-any-prompt/): Google Research on a model that generates a whole interface for a prompt
- [AG-UI Protocol](https://www.copilotkit.ai/ag-ui) and the [CopilotKit Interactive Dojo](https://dojo.ag-ui.com/): the protocol beyond streaming, and live demos of shared state, human in the loop and generative UI
- [A2UI: Get Started in 5 Minutes](https://a2ui.org/#get-started-in-5-minutes) and [How Agents Work](https://a2ui.org/reference/agents/#how-agents-work): the protocol, from the shortest way in to the agent side of it
- [AGenUI](https://github.com/AGenUI/AGenUI): a native A2UI renderer for iOS, Android and HarmonyOS, so the protocol reaches a phone instead of a browser
- [AG-UI: State Management](https://docs.ag-ui.com/concepts/state): how the agent's state and the front end stay in step
- [CopilotKit: Agent Context](https://docs.copilotkit.ai/agent-app-context), [shared state](https://docs.copilotkit.ai/shared-state) and [frontend tools](https://docs.copilotkit.ai/frontend-tools): the three pieces that let an agent read the app it lives inside and act on it
- [OpenGenerativeUI](https://github.com/CopilotKit/OpenGenerativeUI): CopilotKit's open-source generative UI framework
- [json-render](https://github.com/vercel-labs/json-render): Vercel Labs' generative UI framework
- [OpenUI](https://www.openui.com/): the open standard for generative UI, built on a streaming-first language; its makers report far fewer tokens than JSON-based UI formats, in their own benchmark
- [LangChain: headless tools](https://docs.langchain.com/oss/python/langchain/frontend/headless-tools): tools whose real execution happens in the user's app instead of on the server
