# JevFlow

JevFlow connects external work systems (Jira, GitHub, CI pipelines) to an
internal decision engine ("Jev") through a Webhook API. Incoming events are
classified, prioritized and decided by configurable rules, with Redis as a
hot cache and PostgreSQL as the historical store.

## Pipeline

```
Jira / GitHub / CI
       |  webhooks (POST /api/webhooks/<source>/)
       v
Webhook API (Django REST, token auth)
       |  normalize -> SyncLog
       v
Jev Engine (Rules / Classification / Prioritization / Decision)
  choice() / noul() / score() helpers
       |----> Redis cache (hot state, dedup 5s window)
       |----> PostgreSQL (DecisionRun, EngineCall history)
       v
DecisionMap actions (notify / escalate / auto-resolve)
```

## Architecture

```
Browser (React 18 + MUI + ReactFlow)
  |  /api/* /auth/* -> :4000
  v
macaco (Express :4000, Passport local/google/outlook/slack)
  |  Token header from session -> Django
  v
Django REST API (:8080, drf-yasg /swagger.json)
  |  DB + cache
  v
PostgreSQL :5432  +  Redis :6379
```

## Quickstart

```bash
./start-dev.sh
```

This builds containers, waits for `http://localhost:8080/swagger.json`,
regenerates frontend resources from Swagger, and starts the proxy + Vite app.

## Default login

- user: `root@local.com`
- password: `admin`

## Ports

| Service  | Container       | Port        |
|----------|-----------------|-------------|
| postgres | jevflow_db      | 5432        |
| redis    | jevflow_redis   | 6379        |
| django   | jevflow_django  | 8080 -> 8000|
| macaco   | jevflow_app     | 4000        |
| vite     | trampoline      | 5173        |

## Fake data

`python manage.py generate_fake_data --clear` seeds:

- 3 integrations (jira connected, github connected, ci pending)
- 2 webhook endpoints + ~20 sync logs
- 1 decision map ("Triage") with trigger -> classify -> prioritize -> decide -> action nodes
- 2 engine presets (default-triage, strict-escalation)
- ~15 decision runs (decided / escalated / pending) + engine calls
- 1 account + demo users/roles
