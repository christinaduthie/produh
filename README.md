# ProDuh! — The “duh” way to ship smarter

> **TL;DR**  
> End‑to‑end Product Management co‑pilot: **Discovery → Strategy → Development → Testing → Release → Go‑to‑Market → Operate → Deprecation**.  
> AI‑assisted strategy, App Agnostic, and an always‑on **operate loop**—with the **human in the loop**.

---

## Table of Contents
- [ProDuh! — The “duh” way to ship smarter](#produh--the-duh-way-to-ship-smarter)
  - [Table of Contents](#table-of-contents)
  - [Problem](#problem)
  - [Solution](#solution)
  - [Key Features](#key-features)
  - [Architecture](#architecture)
  - [Monorepo Layout](#monorepo-layout)
  - [Tech Stack](#tech-stack)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Environment Variables](#environment-variables)
    - [Local Setup](#local-setup)
    - [Running](#running)
  - [Integrations](#integrations)
    - [Jira](#jira)
    - [AI (Gemini / Vertex AI)](#ai-gemini--vertex-ai)
  - [API Reference](#api-reference)
  - [Data Model](#data-model)
  - [Security \& Privacy](#security--privacy)
  - [Deployment](#deployment)
  - [Success Metrics](#success-metrics)
  - [Roadmap](#roadmap)
  - [Contributing](#contributing)
  - [Troubleshooting / FAQ](#troubleshooting--faq)
  - [Maintainers](#maintainers)
  - [License](#license)
  - [Changelog](#changelog)

---

## Problem
Product managers juggle scattered discovery notes, KPIs, Jira/ADO issues, documents, and handoffs. Strategy rarely survives into execution, and post‑release signals don’t loop back into the plan—leading to drift, rework, and opaque outcomes.

## Solution
**ProDuh!** unifies the lifecycle so intent and metrics persist from **discovery** through **deprecation**:
- **Strategy as data:** KPIs & Goals are first‑class and reused in planning, backlog shaping, reviews, and operate.
- **Multi‑agent loop:** An agent running in a loop architecture monitors product health, maps signals to intent, opens bugs/incidents, and proposes backlog deltas—until deprecation is complete.
- **Human‑in‑the‑loop:** ProDuh drafts and automates routine steps; you accept, edit, or regenerate with traceable rationale.

## Key Features
- **AI Discovery & Strategy:** Generate briefs, user problems, KPIs/Goals, and first‑cut roadmaps from prompts.
- **Backlog Shaping:** Turn strategy into epics, stories, and subtasks (Jira‑ready).
- **Jira Enhancements:** Priority (RICE/WSJF), dependency detection, sprint goal compose, DoD checklists, risk radar, hierarchy repairs.
- **Operate Loop (Always‑on):** Detect drift & anomalies; auto‑ticket bugs/incidents; propose fixes; track to closure.
- **Portfolio View:** Manage multiple products (approved/pending/upcoming) with per‑product tabs across all phases.
- **End‑to‑End:** Discovery → Strategy → Development → Testing → Release → GTM → Operate → **Deprecation**.

## Architecture
- **Client:** React (Vite) talks to server REST endpoints.
- **Server:** Node.js (TypeScript) exposes `/api/*` routes.
- **AI:** Google Vertex AI (Gemini 1.5).
- **DB:** Postgres (via Prisma or equivalent).
- **Integrations:** Jira today; designed for ADO, Confluence, GitHub, ServiceNow next.

![Architecture](docs/architecture.png)

## Monorepo Layout
```
produh/
├─ client/                 # React app
├─ server/                 # Node + TypeScript API
├─ scripts/                # project scripts & utilities
└─ docs/                   # architecture, ADRs, diagrams
```

## Tech Stack
- **Frontend:** React 18, Vite, TypeScript
- **Backend:** Node.js 22, TypeScript, tsx
- **AI:** Google Vertex AI (Gemini 1.5 family)
- **DB:** Postgres (+ Prisma)
- **Tracker:** Jira Cloud REST API
- **Package Manager:** npm (pnpm optional)

## Getting Started

### Prerequisites
- Node.js ≥ 20 (tested on 22.x)
- npm ≥ 9
- Postgres (local or hosted)
- Google Cloud project with Vertex AI enabled
- Jira Cloud project (for issue automation)

### Environment Variables
Create `.env` files:

**server/.env**
```ini
PORT=5050
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DB

GOOGLE_PROJECT_ID=your-gcp-project-id
VERTEX_LOCATION=us-central1
VERTEX_MODEL=gemini-1.5-flash
GOOGLE_APPLICATION_CREDENTIALS=/abs/path/service-account.json

ATLASSIAN_DOMAIN=your-domain.atlassian.net
ATLASSIAN_EMAIL=you@example.com
ATLASSIAN_API_TOKEN=your-token
ATLASSIAN_PROJECT_KEY=PROJ
ATLASSIAN_STORY_TYPE=10001
ATLASSIAN_SUBTASK_TYPE=10002
```

**client/.env**
```ini
VITE_API_URL=http://localhost:5050
```

### Local Setup
```bash
# from repo root
(cd server && npm i)
(cd client && npm i)

# (optional) Prisma
# (cd server && npx prisma generate && npx prisma migrate dev)
```

### Running
```bash
# Backend
cd server && npm run dev

# Frontend
cd client && npm run dev
```
Visit http://localhost:5173

## Integrations

### Jira
Requires the `ATLASSIAN_*` envs and numeric **issue type IDs**.  
Find IDs via Jira REST: `/rest/api/3/issuetype` or `issue/createmeta`.

### AI (Gemini / Vertex AI)
Ensure the model exists in your region, credentials are readable by the server, and quotas are set appropriately.

## API Reference
- `POST /api/discover` → strategy brief + backlog suggestions
- `POST /api/jira/sync` → create Story/Sub‑task issues
- `GET /health` → liveness

## Data Model
Key entities: `Product`, `Brief`, `KPI`, `Goal`, `Epic`, `Story`, `Task`, `Signal`, `Incident`.

## Security & Privacy
- Keep secrets in `.env` (never commit them).
- Principle of least privilege for service accounts.
- (Roadmap) SSO/roles, audit trails, prompt redaction & PII handling.

## Deployment
- **Dev:** Local / Docker Compose
- **Prod:** Any Node hosting (e.g., Render/Fly/AWS). Set envs, provision DB, run server then client.
- Expose health checks and ship logs/metrics.

## Success Metrics
- **Time‑to‑strategy:** ↓ 50–70% to first viable brief.
- **Story readiness:** ≥ 80% implementation‑ready on first pass.
- **Lead time:** ↓ 20–30% from strategy approval to first merged PR.
- **Operate responsiveness:** ≥ 90% of critical signals auto‑ticketed; MTTR ↓ 25%.
- **Backlog coverage:** ≥ 90% of strategy themes mapped to epics/stories in one session.

## Roadmap
- **Integrations:** ADO, Confluence write‑back, GitHub PR signals, ServiceNow incident→backlog loop.
- **Quality Agents:** Requirements‑QA micro‑agent; Release Readiness mini‑agent with risk gates.
- **Operate+:** Anomaly detection, experiment loops, automated deprecation flows & migrations.
- **Governance:** SSO, roles, audit logs, templates, and guardrails for scale & compliance.

## Contributing
1. Fork → feature branch → PR.
2. Follow Conventional Commits.
3. Keep README and `.env.example` updated.

## Troubleshooting / FAQ
- **Gemini 404:** Wrong model/region → fix `VERTEX_MODEL`/`VERTEX_LOCATION`.
- **429 quotas:** Add retry/backoff; request higher quotas.
- **CORS errors:** Check `CORS_ORIGIN`.
- **Jira type IDs missing:** Ensure user/project scheme includes Story & Sub‑task.

## Maintainers
- DYNE LABS — @your-team-handle

## License
MIT (see `LICENSE`)

## Changelog
See `CHANGELOG.md`.
