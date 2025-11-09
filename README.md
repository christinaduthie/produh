# ProDuh!

An opinionated, full‑stack Product Management co‑pilot that helps you go from *idea → strategy → backlog → execution*. It provides AI‑assisted discovery, strategy briefs, and Jira issue automation in one workflow.

> **Monorepo layout:** `client/` (React) + `server/` (TypeScript/Node) + shared project scripts.

---

## Table of contents
- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
  - [Prereqs](#prereqs)
  - [Environment variables](#environment-variables)
  - [Local setup](#local-setup)
- [Running the apps](#running-the-apps)
- [Jira integration](#jira-integration)
- [AI (Gemini / Vertex AI) integration](#ai-gemini--vertex-ai-integration)
- [API](#api)
- [Project scripts](#project-scripts)
- [Conventions](#conventions)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Features
- **AI Discovery & Strategy**: Generate product briefs, user problems, success metrics, and first‑cut roadmaps from prompts.
- **Backlog Shaping**: Turn strategy output into epics, stories, and subtasks.
- **Jira Automation**: Create Story/Sub‑task issues directly in your Jira project.
- **PM Workbench**: A “Discovery” screen to iterate on prompts and compare AI suggestions.

> Note: File/paths referenced below are based on the current codebase: `server/src/ai/gemini.ts`, `server/src/routes/discover.ts`, `server/src/db/index.ts`, `client/src/pages/Discovery.tsx`.

---

## Architecture
```
produh/
├─ client/                 # React app (Vite)
│  ├─ src/
│  │  ├─ pages/Discovery.tsx
│  │  └─ index.css
│  └─ ...
├─ server/                 # Node + TypeScript API
│  ├─ src/
│  │  ├─ ai/gemini.ts      # Vertex AI Gemini helpers
│  │  ├─ routes/discover.ts# Discovery/strategy routes
│  │  ├─ db/index.ts       # DB client (e.g., Prisma/Postgres)
│  │  └─ index.ts          # HTTP server
│  └─ ...
└─ README.md
```

- **Client**: React + Vite, talks to `server` REST endpoints.
- **Server**: Node (TypeScript, `tsx` for dev), exposes `/api/*` routes.
- **AI**: Google Vertex AI (Gemini 1.5 family) for generation.
- **DB**: Postgres (via Prisma or similar) for persistence.

---

## Tech stack
- **Frontend**: React 18, Vite, TypeScript
- **Backend**: Node.js 22, TypeScript, `tsx`
- **AI**: Google Vertex AI Gemini
- **Issue Tracker**: Jira Cloud REST API
- **DB**: Postgres (+ Prisma if present)

> **Package manager:** You can use **npm**. `pnpm` is optional (see Troubleshooting for Corepack notes).

---

## Getting started

### Prereqs
- **Node.js** ≥ 20 (tested on **22.13.1**)
- **npm** ≥ 9
- **Postgres** (local or hosted)
- A **Google Cloud** project with **Vertex AI** enabled (for Gemini)
- A **Jira Cloud** project (for issue automation)

### Environment variables
Create two files, one per app:

**`server/.env`**
```
# Server
PORT=5050
CORS_ORIGIN=http://localhost:5173

# Database
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DB

# Google / Vertex AI
GOOGLE_PROJECT_ID=your-gcp-project-id
VERTEX_LOCATION=us-central1
VERTEX_MODEL=gemini-1.5-flash
# Service Account auth: one of the following approaches
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
# or provide JSON directly if your library supports it
# GOOGLE_CREDENTIALS_JSON={"type":"service_account",...}

# (Optional) Rate limiting/backoff hints
GEMINI_MAX_TOKENS=4096
GEMINI_TEMPERATURE=0.4

# Jira
ATLASSIAN_DOMAIN=your-domain.atlassian.net
ATLASSIAN_EMAIL=you@example.com
ATLASSIAN_API_TOKEN=your-jira-api-token
ATLASSIAN_PROJECT_KEY=PROJ
# These two are the numeric type IDs (NOT the names)
ATLASSIAN_STORY_TYPE=10001
ATLASSIAN_SUBTASK_TYPE=10002
```

**`client/.env`**
```
VITE_API_URL=http://localhost:5050
```

> If you don’t know your Jira **type IDs**, see [Jira integration](#jira-integration).

### Local setup
```bash
# from repo root
# 1) Install deps
(cd server && npm i)
(cd client && npm i)

# 2) (Optional) Prisma
# If using Prisma:
# (cd server && npx prisma generate && npx prisma migrate dev)
```

---

## Running the apps

**Backend**
```bash
cd server
npm run dev    # uses tsx watch; listens on :5050 by default
```

**Frontend**
```bash
cd client
npm run dev    # Vite dev server on :5173
```

Visit **http://localhost:5173**. The client calls the server at `VITE_API_URL`.

---

## Jira integration
- The server expects a Jira Cloud project and these envs:
  - `ATLASSIAN_DOMAIN`, `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN`, `ATLASSIAN_PROJECT_KEY`
  - **Type IDs**: `ATLASSIAN_STORY_TYPE` and `ATLASSIAN_SUBTASK_TYPE` must be **numeric IDs**.

**Find issue type IDs** (one reliable path):
1. Use Jira REST: `GET /rest/api/3/issuetype` or `GET /rest/api/3/issue/createmeta?projectKeys=<KEY>&expand=projects.issuetypes.fields`
2. Inspect the JSON response and copy the `id` for **Story** and **Sub-task**.

> If your API user cannot see Story/Sub‑task in the response, ensure that:
> - The user has access to the project and issue types.
> - Those issue types are part of the project’s **issue type scheme**.

---

## AI (Gemini / Vertex AI) integration
The helper at `server/src/ai/gemini.ts` calls Gemini via Vertex AI.

**Common pitfalls**
- **404 model not found**: Use a model that exists in your region & API version, e.g. `gemini-1.5-flash` (or a `-002` if your SDK requires exact versions). Also confirm Vertex AI is enabled in your GCP project & location.
- **429 RESOURCE_EXHAUSTED**: You hit rate/quotas. Add exponential backoff and/or lower request frequency; consider requesting higher quotas in GCP.
- **Auth**: Make sure your service account has Vertex AI permissions and your server process can read credentials (env or file path).

---

## API
> The exact routes may evolve; adjust as you wire up the UI. Below are the defaults implied by current files.

### POST `/api/discover`
Generate a strategy brief & backlog suggestions from a prompt.

**Request**
```json
{
  "prompt": "Build a PM co-pilot that turns discovery into execution"
}
```

**Response (example)**
```json
{
  "brief": { "problem": "...", "goals": ["..."], "metrics": ["..."] },
  "backlog": { "epics": [ ... ], "stories": [ ... ] }
}
```

### POST `/api/jira/sync`
Create Jira issues (Story/Sub‑task) from the generated backlog.

**Request**
```json
{ "epics": [...], "stories": [...], "parent": "<optional epic key>" }
```

### GET `/health`
Basic liveness check.

---

## Project scripts
> Run each command inside its folder unless noted.

**server/package.json** (typical)
```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "lint": "eslint .",
    "format": "prettier -w ."
  }
}
```

**client/package.json** (typical)
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "format": "prettier -w ."
  }
}
```

---

## Conventions
- **Branching**: `release`, `feat/*` (e.g., `feat/login`, `feat/uid`), `ui-upgrade`.
- **Commits**: Conventional style (e.g., `feat:`, `fix:`, `docs:`).
- **Env**: All secrets in `.env` files (never commit them).
- **Paths**: Keep routes under `server/src/routes/*`.

---

## Troubleshooting

### Git: pulling `release` with local changes
```
# You have local edits you don’t want to lose
git status
git stash -u                 # stashes tracked + untracked
git pull origin release
# (optional) re-apply your work
git stash pop
```

### pnpm/Corepack errors
If you see `Cannot find matching keyid` from Corepack:
```
corepack disable    # or just use npm
# or install pnpm directly (optional)
npm i -g pnpm
```
You can safely use **npm** for this repo.

### Gemini 404 / 429
- **404 NOT_FOUND**: Check `VERTEX_MODEL` and region compatibility.
- **429 RESOURCE_EXHAUSTED**: Add retry/backoff; reduce frequency; verify quotas.

### Node version
Use Node **22.13.1** (or latest 22.x LTS). If you switch versions, reinstall deps.

---

## Contributing
1. Fork → feature branch → PR.
2. Add/adjust tests where relevant.
3. Keep README and `.env.example` in sync with changes.

---

## License
© DYNE LABS 2025
