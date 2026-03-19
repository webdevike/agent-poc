# PRD: Workspace-Based AI Analysis Platform

## Overview

Replace a planned SNS/SQS/Step Functions data pipeline with a file-driven AI agent system. Instead of orchestrating dozens of Lambda functions with complex state machines, give Claude a workspace (files + tools) and let it decide how to analyze HR event data.

The core philosophy: **files and folder conventions over orchestrated agent code.** Agent behavior is defined by markdown files in a git repo. Customer state is files on S3. Agent output is files on S3. Downstream consumers read files. No database required for v1.

## Problem

The business needs an AI layer on top of ~10 years of HR event data to surface compliance risks, policy violations, workforce issues, etc. across 3,000 customers. The original plan was a traditional AWS event pipeline (SNS → SQS → Step Functions → Lambda) with OpenAI agents at each step. This approach requires:

- Significant orchestration code
- Rigid, predefined analysis steps
- Separate codebases per agent type
- Complex state management between steps
- Months of engineering to build and maintain

## Proposed Solution

A workspace-based system where each analysis job gives Claude a temporary file system seeded with instructions (brain), customer context, and event data. Claude explores the workspace, follows playbooks, and writes its findings as files. The entire system is:

- **One runtime** (Node.js service on K8s)
- **One agent loop** (Claude API with file tools)
- **Multiple agent personalities** (folders in a git repo)
- **Customer state as files** (S3)
- **Output as files** (S3, queryable via Athena)

## Architecture

### Three Layers

```
1. BRAIN (git repo, immutable at runtime)
   What the agent knows how to do.
   Playbooks, rules, schema docs, system instructions.
   Changed only by humans via PR.

2. CUSTOMER CONTEXT (S3, per-customer, read-write)
   What the agent knows about each customer.
   Profile, observed patterns, historical summaries.
   Evolves as the agent processes batches.

3. WORKSPACE (ephemeral, per-job)
   What the agent is working on right now.
   Batch events, scratch notes, output findings.
   Archived to S3 after completion, then deleted.
```

### Data Flow

```
Platform Events (Postgres)
    │
    ▼
Event Router (K8s service)
  - Pulls events from SQS by priority
  - Groups by customer
  - Determines which agent type(s) needed
  - Launches K8s job per customer-batch
    │
    ▼
Agent Job (K8s pod)
  1. Clone brain repo (or pull from S3 cache)
  2. Pull customer context from S3
  3. Materialize batch events into workspace
  4. Run agent loop (Claude API + file tools)
  5. Validate output (Zod schema + business rules)
  6. Write findings to customer's S3 directory
  7. Append to JSONL audit log
  8. Sync updated customer context back to S3
  9. Archive workspace to S3
    │
    ▼
Output (all on S3)
  s3://agent-data/customers/{id}/findings/
  s3://agent-data/customers/{id}/context/
  s3://agent-data/logs/{date}/{batch-id}.jsonl
    │
    ▼
Downstream Consumers
  - User-facing agents read customer files directly
  - Dashboards query JSONL via Athena
  - Existing pipeline can reference findings
```

### Storage Layout

```
s3://agent-data/
  customers/
    {customer-id}/
      context/
        profile.md              ← customer identity, config, basics
        patterns.md             ← agent-observed patterns over time
      findings/
        2026-03-18-batch-001.json
        2026-03-18-batch-002.json
        ...                     ← every batch result, timestamped
      history/
        2026-q1-summary.md      ← periodic rollups
  logs/
    2026/03/18/
      {batch-id}.jsonl          ← structured audit log per batch
  archives/
    2026/03/18/
      {batch-id}/               ← full workspace snapshot
        brain/
        customer/
        batch/
        scratch/
        output/
        metadata.json
```

### Brain Repo Structure

```
github.com/your-org/agent-brain/
  agents/
    compliance/
      system.md
      playbooks/
        termination.md
        benefits_change.md
        leave_request.md
        ...
    analytics/
      system.md
      playbooks/
        turnover_analysis.md
        headcount_trends.md
        ...
    {new-agent}/                ← adding an agent = adding a folder
      system.md
      playbooks/
  shared/
    schema/
      events.md
      employees.md
    rules/
      california_labor.md
      fmla.md
      cobra.md
      ...
    skills/
      summarize_employee.md
      calculate_risk_score.md
      ...
```

## Agent Runtime

### Tools Available to Claude

**File tools (built into runtime):**
- `read_file` — read any file in the workspace
- `write_file` — write to customer/, scratch/, output/ (brain/ and batch/ are read-only)
- `list_directory` — explore the workspace
- `search_files` — grep across workspace files

**Materializer tools (bridge to real data):**
- `query_employee` — pulls employee data from Postgres, writes to workspace
- `query_history` — pulls historical data from MongoDB, writes to workspace
- `query_events` — pulls related events from Postgres, writes to workspace

All materializer tools enforce:
- Read-only access to source databases
- Data scoping (only data relevant to the current customer/batch)
- PII handling rules (redaction, masking as configured)
- Rate limits and query timeouts

### Validation Stack

No LLM-based validation in v1. Three deterministic gates:

```
Agent Output
    │
    ▼
Gate 1: Zod Schema Validation
  - Valid JSON structure
  - Required fields present
  - Enums match allowed values
  - Confidence in valid range
  FAIL → retry once with error context → dead letter queue
    │
    ▼
Gate 2: Completeness Check
  - Every input event has a corresponding finding
  - No duplicate event IDs
  - Customer ID matches
  FAIL → dead letter queue
    │
    ▼
Gate 3: Business Rules (hard-coded)
  - FMLA + termination MUST be escalate or compliance_risk
  - CA final pay date != last work date MUST have flag
  - Any escalate classification MUST have at least one flag
  - Confidence > 0.99 on escalate → suspicious, flag for review
  FAIL → override classification, add system flag
    │
    ▼
Write to S3
```

### JSONL Audit Log

Every tool call and decision is logged as a structured JSONL entry:

```jsonl
{"ts":"...","batch_id":"...","customer_id":"...","agent":"compliance","turn":1,"action":"read_file","path":"brain/system.md"}
{"ts":"...","batch_id":"...","customer_id":"...","agent":"compliance","turn":2,"action":"read_file","path":"customer/context/patterns.md"}
{"ts":"...","batch_id":"...","customer_id":"...","agent":"compliance","turn":5,"action":"classification","event_id":"evt-001","classification":"escalate","confidence":0.95,"flags":["CA_FINAL_PAY_VIOLATION"]}
{"ts":"...","batch_id":"...","customer_id":"...","agent":"compliance","turn":7,"action":"complete","events_processed":4,"duration_ms":45000,"input_tokens":26000,"output_tokens":4000}
```

Stored at `s3://agent-data/logs/{date}/{batch-id}.jsonl`. Queryable via Athena for dashboards, investigations, and cost tracking.

## Downstream: User-Facing Agents

User-facing agents (customer support, internal analysts, customer self-service) don't need a database. They read the same files:

```
User asks: "What compliance issues does Acme Corp have?"
    │
    ▼
User-facing agent workspace:
  brain/ = agents/customer-support/
  customer/ = s3://agent-data/customers/acme-corp/
    context/profile.md
    context/patterns.md
    findings/2026-03-18-batch-001.json
    findings/2026-03-17-batch-042.json
    ...
    │
    ▼
Agent reads the files and answers the question.
No database query. Just files.
```

The same customer directory that the analysis agents write to is the one the user-facing agents read from. Files are the API between agents.

## Model Strategy

### v1
- **Haiku 4.5** for all processing (~$0.01/event)
- Direct Anthropic API for development
- AWS Bedrock for production (data stays in VPC)

### Future
- Sonnet for complex/high-priority events
- Haiku for routine events
- Deterministic routing based on event fields (no LLM router)
- Prompt caching for brain/ files (shared across all requests)
- Batch API for non-urgent processing (50% cost reduction)

## Rollout Plan

### Phase 1: Shadow Mode (v1)

**Goal:** Prove the system produces good results without any production impact.

**Scope:**
- Feature-flagged to 5-10 customers
- Runs alongside existing pipeline, does not replace it
- Writes findings to S3 only (no downstream integration)
- Human review of output quality weekly

**What gets built:**
- Agent runtime (Node.js service, K8s job template)
- Brain repo with first agent type (TBD based on highest-pain event type)
- Workspace provisioning (S3 pull/push, brain clone)
- File tools (read, write, list, search)
- Materializer for Postgres + MongoDB
- Zod validation + business rules gate
- JSONL audit logging
- Simple dashboard showing: batches processed, classifications, cost, failures

**What does NOT get built:**
- User-facing agents
- MCP tools beyond basic materializer
- Validator agent
- Customer context backfill
- Multi-agent orchestration

**Success criteria:**
- Agent produces findings for >95% of batches without hitting dead letter queue
- Classifications align with existing pipeline output >80% of the time
- Where they disagree, human reviewers prefer the agent's answer >50% of the time
- Cost per event stays under $0.02 (Haiku)
- P95 latency under 120 seconds per batch

### Phase 2: Limited Production

- Expand to 50-100 customers
- First user-facing agent (internal analysts read findings)
- Add second agent type
- Add Sonnet tier for high-priority events
- Enable prompt caching
- Customer context starts building up, measure quality improvement over time

### Phase 3: General Availability

- All 3,000 customers
- Multiple agent types
- User-facing agents for customer self-service
- MCP tools for richer data access
- Batch API for cost optimization
- Full Athena dashboards on JSONL logs

## Open Decisions

### Which agent type ships first?

The existing pipeline already handles compliance, policies, worker issues. Options:
- **(a)** Pick the event type the current pipeline handles worst — highest error rate or most manual intervention
- **(b)** Pick the event type that's most expensive to maintain in the current pipeline — most code, most edge cases
- **(c)** Pick something the current pipeline doesn't do at all — new capability, not replacement

Recommendation: **(a)** — shadow mode comparison is most valuable when the current pipeline has known weaknesses.

### Batch sizing strategy

Options:
- **(a)** One event per workspace — simplest, most expensive (brain loaded every time)
- **(b)** All events for one customer in a time window — natural grouping, enables cross-event pattern detection
- **(c)** Fixed batch size (e.g., 10-20 events) — predictable cost and latency

Recommendation: **(b)** — this is what the POC does and it naturally enables the cross-event analysis (WARN Act detection, pattern spotting) that single-event processing would miss. Time window TBD (hourly? as events arrive above threshold?).

### Customer context: what's in profile.md?

For feature-flagged customers, who seeds the initial profile.md?
- **(a)** Engineer manually writes it from existing customer data
- **(b)** Script generates it from database fields (deterministic, no LLM)
- **(c)** One-time LLM job summarizes customer from historical data

Recommendation: **(b)** for v1 — simple template populated from existing customer table fields. It'll look like the Acme Corp profile in the POC. Context builds from there organically.

## Data Sources

### MongoDB (historic, read-only)
- ~10 years of HR data — the deep well
- Agent never queries Mongo directly; materializer handles translation
- Used for: employee historical records, past events, customer-wide aggregates, old compliance incidents
- Materializer pulls only what's relevant to the current batch (a handful of queries, not full scans)

### Postgres (operational, read-only for agents)
- Current employee data, active events, customer configuration
- Source of batch events (pulled via SQS)
- Findings are NOT written back to Postgres in v1 — output stays as files on S3

### Data Safety
- **AWS Bedrock in production** — data never leaves the VPC. Anthropic never sees request/response data.
- Bedrock provides: encryption via KMS, CloudTrail audit logging, IAM access controls, VPC endpoint (PrivateLink) support
- No model training on customer data (guaranteed by AWS terms)
- Direct Anthropic API used only in development with synthetic/anonymized data

## Model Flexibility via Bedrock

Bedrock provides access to multiple model providers beyond Anthropic:

| Provider | Models | Potential Use |
|---|---|---|
| Anthropic | Haiku, Sonnet, Opus | Primary — workspace-native tool use |
| Amazon | Nova Micro, Lite, Pro | Ultra-cheap tier for simple events |
| Meta | Llama 3.x | Cost optimization, no per-token fees |
| Mistral | Large, Medium, Small | Alternative for specific tasks |

Nova Micro is ~20x cheaper than Haiku. For routine events where the playbook is essentially a checklist (voluntary resignation, standard benefits enrollment), cheaper models may be sufficient. The workspace pattern makes this easy to test — same brain, same tools, different model parameter.

## Technical Requirements

- **Runtime:** Node.js (existing team expertise)
- **Infrastructure:** AWS EKS (existing), S3, SQS
- **AI:** Anthropic Claude via direct API (dev) / Bedrock (prod)
- **Validation:** Zod
- **Brain repo:** GitHub (existing org)
- **Monitoring:** Existing observability stack + Athena on JSONL logs
- **Auth/PII:** Bedrock in prod ensures data stays in VPC. Materializer handles PII redaction rules per customer configuration.

## Cost Projections

### LLM Costs (Shadow Mode)

Based on POC results (Haiku, 4 events per batch, ~$0.044 per batch):

| Feature flag customers | Est. events/day | Est. daily cost | Monthly |
|---|---|---|---|
| 5 customers | ~200 | $2.20 | $66 |
| 10 customers | ~500 | $5.50 | $165 |

Shadow mode cost is negligible. This is a low-risk way to validate the approach.

### LLM Costs (Full Scale — 3,000 customers)

| Scenario | Events/day | Model | Daily | Monthly |
|---|---|---|---|---|
| All Haiku | 50,000 | Haiku 4.5 | $500 | $15,000 |
| All Haiku + caching | 50,000 | Haiku 4.5 | $300-350 | $10,000 |
| Tiered (Haiku + Sonnet) | 50,000 | 85/15 split | $725 | $22,000 |
| Tiered + caching + batch API | 50,000 | 85/15 split | $350-400 | $11,000 |

### Infrastructure Costs (Full Scale)

| Component | Monthly cost |
|---|---|
| S3 storage (context + findings + archives + logs) | $2-5 |
| K8s compute (spot instances, pods mostly idle waiting on API) | $45 |
| K8s compute (Fargate alternative) | $360 |
| Data transfer (all internal to AWS) | $0 |
| Bedrock premium over direct API | $0 |
| Additional MongoDB/Postgres read load | $0 (negligible) |
| Athena queries on JSONL logs | $5-10 |
| **Total infrastructure** | **~$60-375/month** |

Infrastructure is <3% of total cost. LLM tokens are 97%+ of spend. The only cost lever that matters is model selection, prompt caching, and batch sizing.

## What This Replaces

Instead of building:
- SNS topics for event routing
- SQS queues per event type
- Step Functions state machines for orchestration
- Lambda functions per processing step
- DynamoDB for inter-step state
- Custom retry/error handling per step
- Separate OpenAI agent code per analysis type

We build:
- One K8s job template
- One agent runtime (~500 lines of Node)
- One git repo of markdown files
- S3 directories

The complexity moves from infrastructure code to domain knowledge in playbooks. Infrastructure stays simple and static. Agent behavior changes by editing markdown files and merging PRs.

## Known Limitations and Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Latency floor** (~30-120s per batch) | Medium | Acceptable for batch processing. Keep deterministic pipeline for any real-time needs. |
| **Non-determinism** (same input may produce slightly different output) | Medium | Temperature 0, treat first run as authoritative, never reprocess for audits. |
| **Playbook quality** (bad playbook = bad results at scale) | High | Validation pipeline: test new playbooks against historical batches before merging. |
| **Compounding bad context** (incorrect patterns.md update poisons future runs) | High | Zod validation on output, completeness checks, diff review on context updates, cap file sizes. |
| **Observability** (harder to monitor than deterministic pipeline) | Medium | JSONL audit logs, Athena dashboards, quality metrics over time. |
| **Context window ceiling** (200K tokens for Haiku, 1M for Sonnet) | Medium | Cap patterns.md size, limit batch sizes, monitor token usage per run, periodic summarize/archive of old context. |
| **Vendor interpretation lock-in** (playbooks tuned for Claude may work differently on other models) | Low | Acceptable tradeoff. Workspace pattern is model-agnostic even if playbook tuning isn't. |

## Appendix: POC Results

A working POC exists at https://github.com/webdevike/agent-poc demonstrating the full workspace pattern against sample HR events (terminations with compliance risks, benefits changes).

### Sonnet 4.6 vs Haiku 4.5 Comparison (same batch, same brain)

| | Sonnet 4.6 | Haiku 4.5 |
|---|---|---|
| Turns | 7 | 9 |
| Input tokens | 26,436 | 35,346 |
| Output tokens | 4,383 | 3,980 |
| Cost | $0.145 | $0.044 |
| CA final pay violation caught | Yes | Yes |
| FMLA termination flagged | Yes | Yes |
| Missing PIP + complaint flagged | Yes | Yes |
| Cross-event WARN Act pattern | Yes | Yes |
| Customer context updated | Yes | Yes |

Both models caught all compliance issues, updated customer context with new patterns, and produced structured findings. Haiku is 70% cheaper with equivalent quality for this use case.
