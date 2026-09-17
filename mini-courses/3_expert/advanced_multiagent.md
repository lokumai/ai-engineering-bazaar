# Advanced Multi-Agent

*(Placeholder module — a short overview for now; full lesson content is coming soon.)*

Agent-to-Agent protocols and coordination patterns beyond the Manager-Worker setup from
Multi-Agent Systems.

**Topics this module will cover**:
- A2A
- Context delegation vs. subagent context delegation vs. messaging pool
- Shared context against isolated context, and what each costs
- Coordination failures, and how they are detected

**References to start from**:
- [Multi-agent systems](https://docs.langchain.com/oss/python/langchain/multi-agent): the patterns and the trade-offs, from the framework that names them
- [@langchain/langgraph-swarm](https://reference.langchain.com/javascript/langchain-langgraph-swarm): the JavaScript package for agents that hand off to each other directly, with a router that remembers which agent is currently active
- [@langchain/langgraph-supervisor](https://reference.langchain.com/javascript/langchain-langgraph-supervisor): the same idea in the Manager-Worker shape, with `createSupervisor()` and a hand-back message when a worker finishes
- [Workflows and agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents): where a fixed workflow stops being enough and an agent has to decide the next step itself

## Tutorial Progress

```mermaid
graph LR
    A[Advanced Tools] --> B[Advanced Memory]
    B --> C[Advanced Multi-Agent]
    C --> D[Advanced Prompting]
    D --> E[Adv. Context Eng.]
    E --> F[Adv. Coding Agents]
    F --> G[Adv. Harness Eng.]
    G --> H[Adv. Agent Arch.]
    H --> I[Advanced UI]
    I --> J[Advanced Deployment]
    J --> K[Advanced Training]
    style A fill:#90EE90
    style B fill:#90EE90
    style C fill:#FFFF00
```
