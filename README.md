# JevFlow

JevFlow connects external work systems (Jira, GitHub, Slack, CI pipelines, VHRS, …) to an internal decision engine ("Jev") through a webhook API. Incoming events are classified, prioritized, decided by configurable rules, and routed to actions or human approvals, with Redis as a hot cache and PostgreSQL as the historical store.

## Pipeline

```
Jira / GitHub / Slack / CI / VHRS
        |  inbound webhooks (POST /api/webhook-endpoint/receive/)
        v
Webhook API (Django REST, shared secret + optional HMAC)
        |  normalize -> SyncLog
        v
Jev Engine (Rules / Classification / Prioritization / Decision / LLM Agent)
   choice() / noul() / score() helpers
        |----> Redis cache (hot state, 5s dedup window)
        |----> PostgreSQL (DecisionRun, EngineCall, ApprovalRequest history)
        v
DecisionMap actions (notify / escalate / auto-resolve / outbound webhooks)
   + human approvals via email/Slack/Teams messages
```

## Architecture

```
Browser (React 18 + TypeScript + MUI + ReactFlow)
  |  /api/* /auth/* -> :4001
  v
macaco (Express :4001, Passport local/google/github/x/outlook/slack)
  |  strips /api, Token header from session -> Django
  v
Django REST API (:8081, drf-yasg /swagger.json)
  |  DB + cache
  v
PostgreSQL :5432  +  Redis :6379
```

## Quickstart

### Backend

```bash
./start-dev.sh
```

This builds/starts the Docker containers and waits for `http://localhost:8081/swagger.json`.

### Frontend

```bash
cd JevFlow-frontend/packages/user-interfaces
npm run build

cd ../../apps/trampoline
npm run dev
```

Open http://localhost:5174.

## Default login

- user: `root@local.com`
- password: `admin`

## Ports

| Service  | Container       | Host port | Notes |
|----------|-----------------|-----------|-------|
| postgres | `jevflow_db`    | `5432`    |       |
| redis    | `jevflow_redis` | `6379`    | sessions + cache |
| django   | `jevflow_django`| `8081`    | API + Swagger |
| macaco   | `jevflow_app`   | `4001`    | auth proxy |
| vite     | `trampoline`    | `5174`    | dev server |

## Fake data

```bash
docker exec -e DEV=1 jevflow_django python manage.py generate_fake_data --clear --accounts 1
```

Seeds:

- Accounts, users (local + social), and roles.
- Integrations: examples for each type — **LLM** (Codex), **SaaS** (Jira, GitHub, AWS, VHRS), and **Messaging** (Slack, Teams).
- Webhook endpoints: inbound + outbound per integration, plus extra VHRS event hooks.
- Approval tools: email/message channels per integration, plus VHRS-specific tools.
- Decision maps: Jira triage, manual review router, PR auto-review, incident escalation, **VHRS Leave Approval**, and **VHRS New Hire Onboarding**.
- Decision runs executed through the real engine path, producing answers, action results, approval requests, and SyncLogs.
- Engine presets/calls, audit logs, and notifications.

## UI guide

For a screen-by-screen description of the user interface, see [`UI.md`](./UI.md).

## End-to-end tests

```bash
cd JevFlow-frontend/apps/trampoline
npx playwright install chromium    # once
npm run test:e2e                   # headless
```

Requires the backend stack to be running. The suite currently has 14 passing tests covering login, navigation, and the dashboard.

## Developer notes

For detailed conventions, build chains, and troubleshooting, see [`AGENTS.md`](./AGENTS.md).
