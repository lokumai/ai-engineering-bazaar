# Advanced Agent Servers

*(Placeholder module: a short overview for now, full lesson content is coming soon.)*

An agent server keeps long agent runs alive: it queues the work, hands it to workers, recovers when a worker crashes, and streams progress to the user. This module compares four ways to build one, from a bare Redis queue to serverless durable orchestration.

**Topics this module will cover**:
- Aegra: a native Redis worker queue with lease locks
- SkeinJS: BullMQ on Redis
- The Vercel AI SDK with serverless durable orchestration (Inngest, Temporal)
- Redis Streams: an append-only log, a lighter Kafka
- Choosing between them

## Aegra: A Redis Worker Queue with Lease Locks

**How it works.** Workers take jobs from a native Redis queue and hold each one with a lease lock. A worker proves it is alive with a heartbeat that renews its lease in Redis, and progress reaches the frontend through Redis pub/sub. The pipelines are simple and blocking.

**What it costs.** You write the heartbeat loop yourself, at the application level. The structure is brittle: if a worker crashes and no separate sweeper script is running, its jobs disappear.

**Choose it when** you run a lightweight cluster, in more than one language, where tasks are linear and memory must stay small. It needs almost no infrastructure, it keeps nothing in memory (a job leaves memory the moment it is taken), and every programming language can talk to it.

## SkeinJS: BullMQ on Redis

**How it works.** BullMQ builds a queue out of several Redis structures that work together. Sorted sets (ZSETs) schedule jobs by timestamp, hashes hold each job's state, and lists queue the active tasks. A stalled-job check recovers the jobs of a worker that crashed, and Redis pub/sub streams progress to the frontend.

**What it costs.** It is tied to one runtime: BullMQ is a Node.js library. It erases a job's record as soon as the job succeeds, so there is no history to look at afterwards. And it creates a very large number of keys in the cluster.

**Choose it when** your backend is Node.js or TypeScript and you want rich agent loops now, without writing queue logic yourself. Development is fast: exponential backoff retries, cron jobs and rate limits come built in, and ready-made admin dashboards exist.

## Serverless Durable Orchestration: The Vercel AI SDK with Inngest or Temporal

**How it works.** This approach assumes nothing stays running. An agent run is not one long, open loop: it is a chain of small, separate HTTP events. Between two events, the run can be paused, saved to a database, and continued later on a different machine anywhere in the world. Under the hood, these are virtual actors, or state machines.

**What it costs.** It ties you deeply to a provider's cloud APIs, or to a complex runtime that you host yourself. A function that wakes up has a cold-start delay. And it cannot keep a live TCP or WebSocket connection open.

**Choose it when** you deploy on a fully serverless platform, such as Vercel, and your agents run slow, parallel analyses that take hours. There are no servers to set up and nothing to pay for while idle, an agent can run for hours or days without fearing a server crash, and long chains of dependent tool calls fit the model naturally.

## Redis Streams: A Lighter Kafka

**How it works.** A Redis stream is an append-only log, indexed by time. Messages that a consumer has received but not yet acknowledged stay in a built-in pending entries list (PEL), so nothing is lost when a consumer dies.

**What it costs.** You write a lot of low-level, repetitive loop code. There is no built-in way to delay a job. And if you forget to cap the stream's length (`MAXLEN`), Redis can run out of memory.

**Choose it when** you build an enterprise-grade, event-driven mesh of many agents, real-time logging pipelines, or your own distributed system. The pending entries list gives fault tolerance at the database level, the log is an unchangeable record of every step an agent took, and many consumers can read the same messages.

## Choosing Between Them

| | Best for | Main risk |
|---|---|---|
| Aegra | A small, simple, multi-language cluster with linear tasks | Jobs disappear when a worker crashes and no sweeper runs |
| SkeinJS (BullMQ) | A Node.js or TypeScript backend that has to ship fast | Tied to one runtime; many keys in the cluster |
| Serverless durable orchestration | Hours-long agent runs on a serverless platform | Provider lock-in; cold starts; no live connections |
| Redis Streams | An event-driven mesh of many agents, with an audit trail | Much low-level code; memory runs out without `MAXLEN` |

## References

### 📄 Articles

- [Redis Streams](https://redis.io/docs/latest/develop/data-types/streams/): the data type, consumer groups and the pending entries list
- [Redis pub/sub](https://redis.io/docs/latest/develop/interact/pubsub/): how the first two options stream progress to the frontend

### 🛠️ Tools

- [BullMQ](https://docs.bullmq.io/): the Redis queue library under SkeinJS
- [Inngest](https://www.inngest.com/) and [Temporal](https://temporal.io/): durable orchestration for long-running work
- [AI SDK](https://ai-sdk.dev/): Vercel's TypeScript toolkit for AI apps and agents

### 🗃️ Repositories

- [Aegra](https://github.com/aegra/aegra): an open-source, self-hosted agent backend

<!-- NEED: a link for SkeinJS; no repository by that name was found on 2026-11-07. -->
