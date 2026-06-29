# SalesArc — AI Sales Follow-up CRM

> Built on Lemma SDK · Groq llama-3.1-70b · Next.js + Express · Hackathon submission

## Problem

Founders, freelancers, and early sales teams forget who to follow up with, what was promised, and which leads are warm. Manual CRMs record history but don't tell you what to do next.

## Solution

SalesArc is an agentic CRM that:
- **Tracks leads** with full conversation history (emails, calls, notes)
- **Summarises each lead** using AI — pain points, objections, budget signals, closing angle
- **Maintains a priority queue** — ranked by heat, deal size, ICP fit, and days overdue
- **Drafts follow-up emails** personalised to the last interaction
- **Suggests next actions** with urgency ratings
- **Logs everything** to Lemma for observability and prompt iteration tracking

## Architecture

```
packages/
├── lemma-config/     # Lemma SDK client, prompt keys, system prompts,
│                     # ensurePrompts(), ensureEvaluators()
├── api/              # Express API
│   └── src/
│       ├── agents/
│       │   ├── summarise.ts   # Lead summary agent (Lemma prompts + evaluators)
│       │   ├── followup.ts    # Follow-up draft agent (Lemma prompt iterations)
│       │   └── priority.ts    # Priority queue agent (Lemma datasets + scoring)
│       ├── routes/
│       │   ├── leads.ts       # CRUD + interaction logging
│       │   ├── followup.ts    # Draft, send, skip
│       │   ├── agent.ts       # POST /agent/run — full agentic loop
│       │   └── logs.ts        # Lemma event log
│       └── lib/
│           ├── store.ts       # In-memory store (swap for Supabase)
│           └── groq.ts        # Groq LLM client
└── web/              # Next.js frontend
```

## How Lemma SDK is used

| Lemma feature | Where | Purpose |
|---|---|---|
| `lemma.prompts.create` | summarise.ts, followup.ts | Version every prompt used per lead |
| `lemma.prompts.createIteration` | summarise.ts, followup.ts | Track each generation as an iteration |
| `lemma.evaluators.create` | lemma-config | Register quality rubrics for summaries and follow-ups |
| `lemma.evaluators.evaluate` | summarise.ts, followup.ts | Score every AI output before persisting |
| `lemma.datasets.generateSchema` | priority.ts | Infer lead-scoring schema from description |
| `lemma.datasets.create` | priority.ts | Store the priority queue as a Lemma dataset |
| `lemma.datasets.generateValidators` | priority.ts | CEL rules for data integrity |
| `lemma.datasets.generateDataset` | priority.ts | Populate scored leads into the dataset |
| `lemma.logs.create` | all agents | Event log for every agent action |

## Core agentic loop

```
POST /api/agent/run
  → runPriorityAgent()
      → lemma.datasets.generateSchema()
      → lemma.datasets.create()
      → callGroqJSON(NEXT_ACTION_SYSTEM) per lead
      → callGroqJSON(ICP_SCORE_SYSTEM) per lead
      → lemma.logs.create()
  → draftFollowUp() × 3
      → lemma.prompts.createIteration()
      → callGroq(FOLLOWUP_DRAFT_SYSTEM)
      → lemma.evaluators.evaluate()
      → lemma.logs.create()
  → returns { queue, drafts }
```

## Setup

```bash
# 1. Clone and install
npm install

# 2. Set env vars
cp .env.example .env
# Add LEMMA_API_KEY and GROQ_API_KEY

# 3. Run both services
npm run dev
# API → http://localhost:3001
# Web → http://localhost:3000
```

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | /api/leads | All leads sorted by priority |
| POST | /api/leads | Create lead |
| PATCH | /api/leads/:id | Update stage / heat |
| POST | /api/leads/:id/interactions | Log email, call, note |
| POST | /api/leads/:id/summarise | Trigger AI summary |
| GET | /api/followup | All drafts |
| GET | /api/followup/due | Overdue leads |
| POST | /api/followup/draft/:leadId | Draft follow-up for lead |
| PATCH | /api/followup/:id/send | Mark sent |
| POST | /api/agent/run | **Full agentic loop** |
| GET | /api/agent/queue | Priority queue |
| GET | /api/logs | Lemma event log |

## Production swap

Replace `packages/api/src/lib/store.ts` with Supabase or Postgres — the agent files don't touch the store directly.
