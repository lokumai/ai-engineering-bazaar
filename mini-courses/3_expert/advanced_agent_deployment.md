# Advanced Agent Deployment

*(Placeholder module: a short overview for now, full lesson content is coming soon.)*

Running an agent as a real production service, not as a one-off script or a chat session. The agent runs behind a server, keeps its state when something fails, and does its work inside an isolated space, so that the code it writes and the computer it controls cannot harm the host.

**Topics this module will cover**:
- Agent servers and the LangChain Agent Protocol
- The stack behind an agent service: API, queue and Redis workers
- Runtime: checkpoints, fault tolerance and time travel
- Human in the loop in production: interrupts and steering
- Computer use: agents that control a browser or a desktop
- Sandboxes: where an agent runs the code it writes
- Containers and microVMs (Firecracker, gVisor): how much isolation each gives
- Hosted sandboxes for agents, such as E2B and Daytona
