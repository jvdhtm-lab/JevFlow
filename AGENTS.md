# JevFlow – Agent Notes

Comprehensive notes for coding agents working on JevFlow.

## Table of contents

1. [Tech stack & ports](#tech-stack--ports)
2. [Getting started](#getting-started)
3. [URL & request flow](#url--request-flow)
4. [Project structure](#project-structure)
5. [Running the project](#running-the-project)
6. [Environment variables](#environment-variables)
7. [Backend conventions](#backend-conventions)
8. [Frontend architecture](#frontend-architecture)
9. [Auth](#auth)
10. [Jev Engine](#jev-engine)
11. [Decision map editor](#decision-map-editor)
12. [Integration hooks & webhooks](#integration-hooks--webhooks)
13. [useRItem pattern](#useritem-pattern)
14. [Dynamic UI components](#dynamic-ui-components)
15. [Filtering standard](#filtering-standard)
16. [Codegen CLI](#codegen-cli)
17. [Full-stack model pattern](#full-stack-model-pattern)
18. [Page shells & component patterns](#page-shells--component-patterns)
19. [Annotation helpers](#annotation-helpers)
20. [Backend helpers for UI](#backend-helpers-for-ui)
21. [Fake data](#fake-data)
22. [End-to-end tests](#end-to-end-tests)
23. [Troubleshooting](#troubleshooting)
24. [Done / changelog](#done--changelog)

---

## Tech stack & ports

| Layer | Technology | Port |
|---|---|---|
| Backend | Django 3.2.4 + Django REST Framework + drf-yasg (`/swagger.json`) | `:8081` |
| Proxy | Express (macaco) + Passport + Redis-backed sessions | `:4001` |
| Frontend dev server | Vite + React 18 + TypeScript | `:5174` |
| Frontend UI | MUI (`#0AA2A2` primary, `#7C3AED` accent), ReactFlow | — |
| Database | Postgres 15 | `:5432` |
| Cache / sessions | Redis 7 | `:6379` |

Ports are intentionally shifted from VHRS (`:8080/:4000/:5173`) so both stacks can run side-by-side.

---

## Getting started

### Prerequisites

- Docker + Docker Compose
- Node.js / npm
- Chromium for Playwright (installed once via `npx playwright install chromium`)

### One-time setup

```bash
# Backend containers
cd JevFlow
docker compose up -d

# Frontend dependencies
cd JevFlow-frontend
npm install

# Build the shared UI package once
cd packages/user-interfaces
npm run build
```

### Run

```bash
# 1. Ensure backend is up
cd JevFlow
docker compose up -d

# 2. (Optional) seed fake data
docker exec -e DEV=1 jevflow_django python manage.py generate_fake_data --clear --accounts 1

# 3. Rebuild shared UI if you edited packages/user-interfaces/src
cd JevFlow-frontend/packages/user-interfaces
npm run build

# 4. Start the dev server
cd ../../apps/trampoline
npm run dev
```

Open http://localhost:5174.  
Swagger: http://localhost:8081/swagger.json  
Default login: `root@local.com` / `admin`.

---

## URL & request flow

```
Browser (trampoline :5174)
  → Vite proxy `/api/*` and `/auth/*` → macaco :4001
    → macaco strips leading `/api`, adds `Authorization: Token <token>` from session
      → Django :8081 (root-mounted API)
        → Postgres :5432 + Redis :6379
```

- Browser calls `/api/<route>/` or `/auth/*`.
- Trampoline `vite.config.ts` proxies both prefixes to macaco.
- DataLayer prepends `/api` to every request **except** `/auth/*`.
- Macaco strips `/api`, forwards the rest to Django (root-mounted URLconf), and injects the Django token stored in the Redis-backed Express session.
- Example: `/api/decision-map/` → macaco → `GET <django>/decision-map/` with `Authorization: Token <token>`.

---

## Project structure

```
JevFlow/
├── JevCore/                          # Django backend
│   ├── JevCore/
│   │   ├── settings.py               # Swagger inspector registration, etc.
│   │   └── urls.py                   # root-mounted app URLconfs + /auth/login/
│   ├── api_doc/
│   │   └── inspectors.py             # x-vhrs-sortable inspector
│   ├── base/
│   │   ├── constants.py              # choice constants
│   │   ├── models.py                 # TenantBaseModel
│   │   ├── views.py                  # BaseViewSet (tenant scoping, ordering)
│   │   └── management/commands/generate_fake_data.py
│   ├── decisions/                    # DecisionMap / Node / Edge / Run
│   ├── jev_engine/                   # engine presets/calls, /jev/decide/
│   ├── integrations/                 # Integration, WebhookEndpoint, SyncLog
│   ├── identity_api/                 # CustomUser, Account, Role, SocialAccount
│   ├── audit/
│   └── notifications/
├── JevFlow-frontend/                 # npm workspaces monorepo
│   ├── apps/
│   │   ├── macaco/                   # Express proxy (:4001)
│   │   └── trampoline/               # Vite React SPA dev server (:5174)
│   └── packages/
│       ├── cli/                      # Swagger → resources codegen
│       ├── resources/                # Generated API resources
│       └── user-interfaces/          # Annotated UI, Dynamics, DataCache
│           ├── lib/main.ts           # package entry
│           ├── src/connect/          # axios + DataLayer
│           ├── src/context/          # DataCache split contexts
│           ├── src/components/Dynamics/
│           └── src/annotates/
└── docker-compose.yml
```

---

## Running the project

### Backend via Docker

```bash
cd JevFlow
docker compose up -d
```

Containers:

- `jevflow_django` – `:8081`
- `jevflow_app` (macaco) – `:4001`
- `jevflow_db` (postgres) – `:5432`
- `jevflow_redis` – `:6379`

Check health:

```bash
docker ps --filter "name=jevflow"
curl http://localhost:8081/swagger.json
```

### Frontend dev server

```bash
cd JevFlow-frontend/packages/user-interfaces
npm run build

cd ../../apps/trampoline
npm run dev
```

Vite starts on `:5174` by default. If `:5173` is already occupied it falls back to `:5174`.

### Production-ish build

```bash
cd JevFlow-frontend/packages/user-interfaces && npm run build
cd ../../apps/trampoline
npm run build          # outputs dist/
npx vite preview       # serves dist on :5174-ish
```

Macaco can serve a pre-built `dist` folder; in dev, trampoline proxies to macaco and macaco serves its own fallback `dist`.

---

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `DEV=1` | Host / container | Enables `generate_fake_data` management command. |
| `API_TOKEN` | `apps/macaco/.env` | Root service token used by macaco to fetch OAuth provider keys from Django at boot. Printed by `create_superuser.py`. |
| `BASE_URL` | `packages/cli` | Swagger fetch URL, default `http://localhost:8081`. |
| `E2E_BASE_URL` | `apps/trampoline` | Playwright base URL, default `http://localhost:5175`. |
| `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` | `apps/trampoline` | Test credentials, default `root@local.com` / `admin`. |
| `E2E_BROWSER_CHANNEL` | `apps/trampoline` | Default `chrome`. |

---

## Backend conventions

### Models

- All tenant-scoped models inherit from `base.models.TenantBaseModel`, which provides `account` FK, status, timestamps.
- Standalone models (no `account` FK) are handled safely by `BaseViewSet.perform_create()`.

### ViewSets

- Inherit from `base.views.BaseViewSet`.
- Define `filterset_class` explicitly in a `filters.py` file with `label`/`help_text` so drf-yasg documents params.
- Add `search_fields` and `ordering_fields` (or rely on `BaseViewSet.ordering_fields = '__all__'`).
- Tenant scoping: `get_queryset()` filters by resolved `account_id` only if the model has an `account` field.

### Serializers

- Use drf-yasg-friendly field definitions.
- Write-only fields (e.g. `WebhookEndpoint.auth_token`) are re-added by the codegen `WRITE_ONLY_EXTRAS`; extend that list if new write-only fields appear.

### Permissions

- `identity_api.permissions.EntityPermission` matches entity-name variants (`model_name`, `app_label_model_name`, `ModelName`, `app_label.ModelName`) and prefers an account-scoped `Role` before falling back to a global `Role`.

### URL routing

- App URLconfs are mounted at **root** (`path('', include(...))`) in `JevCore/urls.py`.
- `/auth/login/` is a direct `LoginTokenView`.

---

## Frontend architecture

### Workspaces

`JevFlow-frontend` is an npm workspaces monorepo. Trampoline resolves `@vhrs/resources` and `@vhrs/user-interfaces` via workspace symlinks.

### Package roles

- **`packages/resources`** – generated resource files only. `package.json` points `main`/`types` to source (`src/index.ts`) so TypeScript resolves source, not stale `dist/*.d.ts`. `src/connect/index.ts` only exports the `RequestType` interface.
- **`packages/user-interfaces`** – the annotated UI library. Built output lives in `dist/`; trampoline loads `dist/user-interfaces.js`.
- **`packages/cli`** – codegen that fetches swagger and writes `packages/resources/src/servers/`.
- **`apps/macaco`** – Express proxy.
- **`apps/trampoline`** – Vite SPA.

### RULE: always build user-interfaces after any UI change

Trampoline never consumes `packages/user-interfaces/src` directly. After editing anything under `packages/user-interfaces/src/**`:

1. `cd packages/user-interfaces && npm run build` (tsc + vite → `dist/`).
2. Verify the export exists in `dist/user-interfaces.js` and `dist/` is newer than the source.
3. Then run `npx tsc --noEmit` and `npx vite build` in trampoline.

Skipping step 1 means trampoline silently serves the stale bundle.

### Data layer

- `packages/user-interfaces/src/connect/index.ts` – axios instance with `baseURL: "/"`.
- `packages/user-interfaces/src/connect/DataLayer.ts` – 5-second request deduplication, prepends `/api` unless the endpoint is `/auth/*`, clears dedup cache on cancel, returns `undefined` for `axios.isCancel`.
- `packages/user-interfaces/src/context/DataCache.tsx` – split contexts:
  - `useDataCacheState` – `get`, `state`, `resourceVersions`.
  - `useDataCacheDispatch` – `set`, `updateNode`, `appendNode`, `removeNode`, `updateNodeAll`, `appendNodeAll`, `removeNodeAll`, `invalidate`, `invalidateFiltered`, `mergeFiltered`, `bumpResourceVersion`.

---

## Auth

### Local login

- Login form uses `useRItem(resources._auth_, { url: "/auth/login/", fetchOnDeclare: false })` + `createItem({email, password})`.
- Macaco validates via Passport local strategy, calls Django `/auth/login/`, stores `{user, token}` in an Express session backed by Redis.
- DataLayer attaches `Authorization: Token <token>` to API requests.
- 401 responses clear localStorage and dispatch `auth:logout`.

### Social login

- Supported providers: google, github, x, outlook (azure-ad), slack.
- OAuth client keys live in Django `identity_api.OAuthProvider` (one row per provider, seeded inactive; `client_secret` write-only).
- Macaco fetches provider keys server-to-server at boot using `API_TOKEN` and falls back to env vars only if Django has no keys.
- The login page shows only providers returned by public `GET /auth/providers/`.
- `POST /auth/social/` (service-token only) creates/updates the user, links `SocialAccount`, creates tenant `Account` + Owner RWD `Role` rows for first login, and returns `{message, token, user}`.
- X exposes no email → macaco synthesizes `<username>@x.local`; same for GitHub private emails.
- Provider keys are managed at `/settings` (`OAuthSettings`). Restart macaco after changing keys because strategies load at boot.

---

## Jev Engine

Core primitives used inside `DecisionNode.config`:

- `choice(options, weights)` – weighted pick based on keyword matches.
- `noul(signal)` – novelty / belief score (0..1).
- `score(features)` – weighted priority score with rubric levels.
- Runs persist as `DecisionRun` + `EngineCall`; hot state is cached in Redis.

Evaluation contract (`JevCore/jev_engine/engine.py`):

- `evaluate_choice` / `evaluate_score` match each option/criterion by its own tokens plus its `keywords` list.
- `evaluate_noul` treats `config.instructions` as the proposition.

---

## Decision map editor

Location: `apps/trampoline/src/components/DecisionMapEditor/` at route `/maps/:id`.

The inspector edits per-node `config` through structured editors plus an advanced JSON mirror.

### Node config shapes

| Node type | Config key shape | Notes |
|---|---|---|
| `trigger` | `event: string` | Real event name this trigger responds to, e.g. `employee.hired`, `leave.requested`, `issue.created`. Matched against the `event` key of inbound payloads. |
| `rule` | `qtype: "noul"`, `instructions` | proposition text |

The map itself has a separate `category` field (`webhook`, `manual`, `schedule`, `event`) that describes how the map is triggered at a high level.
| `classification` / `decision` | `qtype: "choice"`, `criteria.options[]`, `criteria.keywords: {option: [kw]}` | |
| `prioritization` | `qtype: "score"`, `rubric.weights`, `rubric.keywords`, `rubric.levels: [[threshold, label], ...]` | default levels `[[80,"high"],[50,"medium"],[0,"low"]]` |
| `approval` | `approval_tool: <id>`, `tool`, `action`, `policy.deny_tools[]`, `policy.strict` | picker + “New approval tool” dialog |
| `action` | `action: "http_post"` or label, `method`, `url`, `headers`, `body`, `dry_run`, `webhook_endpoint: <id>` | outbound hook binding is required |
| `llm_agent` | `prompt`, `system`, `model`, `default_answer`, `response_path`, `temperature`, `dry_run` + hook or integration | save requires hook or integration unless `dry_run` |

### Inspector behavior

- A `nodeConfig` **draft object** is edited by both structured controls and the JSON textarea.
- Both write through `updateConfig`, so the JSON always mirrors the form.
- `Apply` writes the draft into `node.data.config` and marks the graph dirty.
- “Save graph” persists nodes/edges; the backend regenerates `spec_yaml`.
- Every `action` node must bind an outbound hook — both `Apply` and `Save graph` refuse otherwise and list the offending node keys.

---

## Integration hooks & webhooks

### Two worlds — do not mix

- **User identity** (`identity_api`): `CustomUser.auth_provider`, `SocialAccount`, `Login`. This is how users log in. Nothing to do with webhooks.
- **Action/trigger integrations** (`integrations` app): `Integration` with `purpose='action_trigger'`. These are the customer’s external systems that maps talk to.

### WebhookEndpoint directions

- **`inbound`** – one fixed shared URL: `POST /api/webhook-endpoint/receive/`. The per-customer `secret` (auto-generated in `WebhookEndpoint.save()`) identifies the caller. Bound to `trigger` nodes via `config.webhook_endpoint`.
- **`outbound`** – URL + auth provided by the customer (`target_url`, `auth_scheme`, `auth_username`, `auth_token`), falling back to `Integration.config`. Bound to `action` nodes via `config.webhook_endpoint`. The bound hook URL wins over any hand-written `url` in the node config. There is no separate `webhook_out` type.

### End-to-end integration flow

1. **Integrations** (`/integrations`): register the external system with base URL + credentials.
2. **Hooks** (`/webhooks`): define inbound hooks (fixed URL + secret to hand the customer) and outbound hooks (customer URL + auth).
3. **Approval tools** (`/tools`): define message/email channels sent `via` an integration or outbound hook.
4. **Maps** (`/maps`): `trigger` binds inbound; `action` binds outbound (required); `approval` binds a tool. Templates use `{{trigger.path}}` and `{{answers.key}}`.
5. **Run**: external system posts to inbound URL → run executes → approvals create `ApprovalRequest`s with review links → human reviews at `/approvals/:token` → actions post out. Watch on `/dashboard`, `/runs`, `/approvals`.

### Inbound auth

`_check_inbound_auth` accepts:

- `X-JevFlow-Secret` header
- `Authorization: Bearer <secret>`
- `?secret=<secret>` query param
- HMAC-SHA256 body signatures: `X-Hub-Signature-256`, `X-Signature-256`, `X-Jira-Signature`, `X-Signature`

The receiver `WebhookEndpointViewSet.receive` (AllowAny) matches by secret and runs every active map whose trigger node is bound to that hook. If the inbound payload contains an `event` key, only maps whose trigger node `config.event` matches that event are executed. It then updates `last_received_at` and writes a `SyncLog`.

### Outbound auth

`build_auth_headers` resolves in order:

1. Hook-level `auth_scheme` / `auth_token`.
2. `Integration.config` keys: `access_token`/`bearer_token`/`bot_token` → Bearer; `username|email` + `api_token|token`, or `username`+`password` → Basic.
3. `config.headers` defaults; node `config.headers` override.

The inbound hook secret is **never** sent outbound.

### SyncLog rule

Every integration touchpoint writes a `SyncLog`:

- Inbound: `WebhookEndpointViewSet.receive` → `direction='in'`, `event_type='webhook:<source>'`.
- Outbound: `_record_outbound_sync_logs` → `direction='out'`, `event_type='action:<node_key>'` per fired/skipped action result. Called from `run_map_for_trigger` and `EngineCallViewSet.perform_create`.

---

## useRItem pattern

```ts
const { data, total, fetchItems } = useRItem(resources.DecisionRun, {
  filter: { status: 'escalated' }, page: 1, pageSize: 20,
});
```

Never use raw `fetch`/axios/dataLayerObj in components — **only `useRItem`**. Generated files are never hand-edited; use annotations.

### Auth hook mapping

```ts
// login
useRItem(resources._auth_, { url: "/auth/login/", fetchOnDeclare: false })
  .createItem({ email, password });

// logout
useRItem(resources._auth_, { url: "/auth/logout", fetchOnDeclare: false })
  .createItem({});

// session check
useRItem(resources._auth_, { url: "/auth/me", fetchOnDeclare: false })
  .fetchItems(true);

// provider list
useRItem(resources.OAuthProvider, { url: "/auth/providers/", fetchOnDeclare: false })
  .fetchItems(true);
```

Always pass `fetchOnDeclare: false` for auth hooks to avoid auto-firing against the override URL.

### Contract (VHRS-shaped)

- `fetchItem(force = false, id?)` – force FIRST, id SECOND. Never call `fetchItem(mapId, true)`.
- `fetchItems(force = false)` – cache-first; pass `true` to force.
- Return values are **raw axios responses**, not `{ total, nodes }`. Read `.data`; paginated lists are `.data.results`.
- Stale handling uses `epochRef`/`mountedRef`; superseded requests resolve to `undefined`.
- `saveItem` uses `PATCH` and calls `updateNodeAll` so all filtered cached lists update.
- `createItem` appends to the main cache, invalidates filtered caches, and bumps the resource version.
- `deleteItem` calls `removeNodeAll`, invalidates filtered caches, bumps the version, **catches errors**, and returns `false` instead of throwing.

### ResourceOptions

```ts
{
  url?: string;
  params?: { name: string; value: string }[];
  sortBy?: string[];          // ?ordering=field1,-field2
  filter?: Record<string, string | number | boolean>;
  search?: string;            // ?search=
  page?: number;
  pageSize?: number;
  force?: boolean;
  headers?: any;
  forceNoDedup?: boolean;
  fetchOnDeclare?: boolean;   // default true
  forceFetchOnNavigation?: boolean;
  forceFetchOnWinBlur?: boolean;
}
```

Cache key: `resourceName` or `resourceName::hid({ url, filter, page, pageSize, sortBy })`.

---

## Dynamic UI components

### DynamicForm

- Handles `boolean` (Switch), `password`, `email`, `date-time`, `date`, `integer` fields.
- Parses backend validation errors into per-field `helperText` + a `generalError` Alert.
- Resolves `f.display.components.asFormInput` per field; skips fields whose renderer returns `null` for conditional show/hide.
- Renders its own footer; do not add custom `DialogActions`. Use `hideFooter` only when embedding inside another controlled surface.

### DynamicTable

- Backend-side sorting via `useRItem` `sortBy`; toggles `?ordering=field` / `?ordering=-field`.
- Renders raw objects safely; shows a record-count chip.
- Supports `show`/`card` row actions opening a record card dialog.

### DynamicList

- Free-key client-side search on `searchable` fields.
- Empty states distinguish “No records yet” vs “No matching records”.
- Row actions (edit/delete/custom/show) with tooltips; edit opens `DynamicForm` drawer; `onRowClick` renders `ListItemButton`.

### Related fields

FK/M2M fields (swagger `x-vhrs-relatedResource`) render through the related resource’s own display:

- `components/Dynamics/relatedItemLabel.ts` – label resolver.
- `RelatedFieldCell.tsx` – table cells.
- `RelatedFieldFilter.tsx` – backend-side Autocomplete filter.
- `RelatedFieldInput.tsx` – form input.
- `relatedFieldResourceName` maps `identity_api.CustomUser` → `User`. A missing mapping crashes `useRItem`; guards exist but do not rely on them.

---

## Filtering standard

### Backend

- Every ViewSet defines `filterset_class` explicitly in `filters.py` with `label`/`help_text`.
- Add `search_fields` and `ordering_fields` via `BaseViewSet` mixins.

### Frontend

- Use `useRItem(res, { filter, page, pageSize, sortBy })`.
- Enum/select/boolean and related inputs filter **backend-side**.
- Free text and dates filter **client-side**.
- No client-side filtering of full lists.

---

## Codegen CLI

Location: `packages/cli`.

```bash
cd packages/cli
npm run buildResources       # tsc + syncContexts (fetches :8081/swagger.json)
```

This writes files under `packages/resources/src/servers/`. Never hand-edit generated files.

### Build chain after any model/serializer/viewset change

1. `cd packages/cli && npm run buildResources`
2. `cd ../resources && npm run build`
3. `cd ../user-interfaces && npm run build`
4. `cd ../../apps/trampoline && npx tsc --noEmit -p tsconfig.json` (and `npx vite build` for shipping)

Skipping step 1 leaves stale fields/columns/validations everywhere.

### JevFlow-specific codegen adaptations

- `/auth/*` paths emit `_auth_.ts` with `baseUrl: "/auth/"`.
- Lone action paths without a GET collection (e.g. `/jev/decide/`) are skipped.
- `WRITE_ONLY_EXTRAS` re-adds hidden write-only fields (currently `WebhookEndpoint.auth_token`).
- `generateSchemas` emits `Models.ts` as individual interfaces + a `definitions` map consumed by `annotates/`.
- Barrel uses hand style (`export { X } from "./X"` + `resources` object), appending new models.

---

## Full-stack model pattern

When adding a new domain model:

1. Django model (inherit `TenantBaseModel` if tenant-scoped).
2. Migration.
3. Serializer.
4. ViewSet (`BaseViewSet` + `filterset_class`) + `filters.py`.
5. URL route.
6. Run `npm run buildResources`.
7. Annotate in `packages/user-interfaces/src/annotates/<model>.tsx`.
8. Register in `packages/user-interfaces/src/annotates/index.tsx`.
9. Build component wrappers in `packages/user-interfaces/src/components/<Model>/`.
10. Add route in `apps/trampoline/src/App.tsx`.
11. Rebuild `user-interfaces` and verify trampoline `tsc`/`vite build`.

---

## Page shells & component patterns

Shared shells in `components/Dynamics/`:

- `PageLayout` – header row with search slot, title, actions; fixed tab bar; scrollable card content.
- `AddResourceButton` – “Add {Resource}” button + right-side create `Drawer` with `DynamicForm`.
- `ResourceTabsPage` – merges multiple resources or custom content into one tabbed card.
- `ResourcePage` – thin wrapper around `PageLayout` + `DynamicTable` + `AddResourceButton`.

### tableColumns

- Set `tableColumns` as the first property in `annotateResource("<Key>", { tableColumns: [...], ... })`.
- Every name must be an exact generated resource field key.
- Convention (5–7 columns): identity field, informative FKs, enum/status, one key date.
- Exclude: `id`, long text, audit FKs, polymorphic links, `action_url`, timestamps, `account`, JSON blobs.

### Resource display helpers

```tsx
const getIntegrationColor = (data?: any) =>
  INTEGRATION_STATUS_COLORS[data?.status] || colors.fallback;
const getIntegrationIcon = (data?: any) => (
  <Webhook sx={{ color: getIntegrationColor(data) }} />
);

annotateResource("Integration", {
  display: {
    components: {
      asIcon: getIntegrationIcon,
      asColor: getIntegrationColor,
    },
  },
});
```

Rules:

1. `getXxxColor(data)` returns a hex from theme configs.
2. `getXxxIcon(data)` returns `<Icon sx={{ color: getXxxColor(data) }} />`.
3. Never hardcode hex colors.

### Actions

Custom save logic belongs in annotation actions. `DynamicForm` runs the resource action first, then calls `onSave` only to close/refetch.

```tsx
const customActions: Action[] = [
  (data, ctx) => ({
    name: 'save',
    title: 'Save',
    icon: <Save />,
    color: 'primary',
    showInForm: true,
    useHandler: async () => {
      const payload = { ...data, derived: compute(data) };
      await ctx?.saveItem?.(data.id, payload);
    },
  }),
  ...(defaultActions.filter(a => a().name !== 'save')),
];
```

---

## Annotation helpers

`packages/user-interfaces/src/annotates/common.tsx` exports:

- `relatedFieldAnnotation(displayField?, formLabel?)`
- `jsonFieldAnnotation(label?, helper?)`
- `createSelectAnnotation(fieldName, options, defaultValue?)`
- `createStatusSelectAnnotation()`
- `createBooleanAnnotation(label)`
- `createDateAnnotation(label)`
- `createDateTimeAnnotation(label)`
- `createNumberAnnotation(label, { min, max, prefix, suffix }?)`
- `defaultResourceCard(data, ctx)`
- `titleCase(s)`, `extractTitle(node)`

Use these instead of hand-rolling selects/switches/date inputs. Object/JSON fields must use `jsonFieldAnnotation` — a plain text input submits `"[object Object]"` and silently fails backend validation.

---

## Backend helpers for UI

### `x-vhrs-sortable`

`api_doc/inspectors.py::sortableFieldInspector` stamps `x-vhrs-sortable: true` on scalar fields so codegen emits `sortable: true`. Registered in `SWAGGER_SETTINGS.DEFAULT_FIELD_INSPECTORS`.

### `BaseViewSet`

- `ordering_fields = '__all__'`.
- `resolve_session_account_id(request, user)` – resolves tenant from session, then `user.account_id`, then auto-defaults superusers/admins to the earliest `Account`.
- `get_queryset()` scopes by `account_id` only if the model has an `account` field.
- `perform_create()` stamps `account_id` only when the model actually has an `account` field.

### `EntityPermission`

Matches multiple entity-name forms and prefers account-scoped `Role` rows.

---

## Fake data

Command: `JevCore/base/management/commands/generate_fake_data.py`.

Requires `DEV=1`:

```bash
docker exec -e DEV=1 jevflow_django python manage.py generate_fake_data --clear --accounts 1
```

`--clear` deletes existing dev data and reseeds from scratch. Without it, new records are appended.

### What is seeded

- Accounts, users (local + social providers), roles.
- Integrations: Jira, GitHub, Slack, Teams, AWS, Codex, and a **VHRS** `generic_webhook` integration pointing at `http://localhost:8080`.
- Webhook endpoints: one inbound + one outbound per integration, plus extra VHRS inbound hooks for `employee.hired`, `leave.requested`, `incident.reported`, and a dedicated VHRS outbound API hook.
- Approval tools: email/message per integration, plus VHRS-specific tools.
- Decision maps:
  - Jira triage, Manual review router, PR auto-review, Incident escalation.
  - **VHRS Leave Approval** and **VHRS New Hire Onboarding**.
- Decision runs: execute through the real `run_map_for_trigger` path, producing answers, action results, approval requests, and SyncLogs.
- Engine presets/calls, audit logs, notifications.

---

## End-to-end tests

Location: `apps/trampoline`.

```bash
cd JevFlow-frontend/apps/trampoline
npx playwright install chromium    # once
npm run test:e2e                   # headless
npm run test:e2e:headed            # headed
```

Playwright config:

- Chromium project, serial worker (`workers: 1`).
- `webServer` boots Vite on `:5175` to avoid colliding with a manual `:5174` dev server.
- `E2E_BASE_URL` overrides the base URL (default `http://localhost:5175`).
- One retry locally, two in CI.

Specs:

- `e2e/auth.ts` – `loginAsAdmin`, `uniqueName`, `expectNoRenderError`.
- `e2e/auth.spec.ts` – valid/invalid login + logout.
- `e2e/navigation.spec.ts` – every sidebar entry renders without errors.
- `e2e/dashboard.spec.ts` – KPI cards, panels, click-through.

Requires macaco (`:4001`) and Django (`:8081`). Default credentials: `root@local.com` / `admin`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Login fails in browser | Old session/cookie stuck | Hard refresh, clear site data for `localhost:5174`, then retry. |
| Login fails everywhere | Backend not running / macaco down | `docker compose up -d` in `JevFlow`. |
| Stale UI after editing `user-interfaces` | Forgot to rebuild dist | `cd packages/user-interfaces && npm run build`. |
| `fetchItem(mapId, true)` → 404 | Wrong argument order | Use `fetchItem(true, String(mapId))`. |
| Missing new columns/fields in tables/forms | Generated resources stale | Run the full codegen chain (`buildResources` → `resources build` → `user-interfaces build` → `tsc`). |
| Decision map action node save refused | No outbound hook bound | Bind an outbound hook in the inspector before saving. |
| Vite starts on a different port | `:5173` or `:5174` occupied | Check console; the URL printed is the correct one. |
| `Unexpected token e in JSON` in macaco logs | A non-JSON body was sent to `/auth/login/` (e.g. bad curl quoting) | Not a UI bug; verify with proper JSON client. |

---

## Done / changelog

### Backend
- App URLconfs mounted at root; `/auth/login/` direct `LoginTokenView`; Swagger `default_version='v2'`.
- macaco proxy strips `/api` and injects `Authorization: Token <token>` from session.
- `sortableFieldInspector` registered; scalar fields emit `x-vhrs-sortable: true`.
- `BaseViewSet` tenant scoping, `ordering_fields='__all__'`, safe `perform_create`.
- `EntityPermission` matches entity-name variants and prefers account-scoped roles.

### Frontend
- `useRItem` rewritten to VHRS shape: correct argument order, `PATCH` saves, cache coherence, stale handling.
- New connect layer with axios + 5s dedup DataLayer.
- `DataCache` split into state/dispatch contexts.
- `DynamicForm` handles booleans, passwords, email, date/time, integer; parses backend errors.
- `DynamicTable` backend sorting, count chip, show/card actions.
- Trampoline `vite.config.ts` minimal (no alias); `hmr.overlay: false`.

### Decision maps
- Fixed `fetchItem(mapId, true)` → `fetchItem(true, String(mapId))`.
- Fixed node/edge resolution from raw axios response (`.data.results`).
- Type-driven inspector editors for all node config shapes.
- `nodeConfig` draft object keeps JSON mirror in sync.
- Action nodes require outbound hook binding.
- Renamed `DecisionMap.trigger_source` → `category` (choices: webhook/manual/schedule/event).
- Trigger node `config.event` is now matched against inbound webhook payloads; only maps with a matching event run.

### Integrations
- Corrected inbound/outbound webhook architecture.
- Fixed shared inbound receiver path; per-customer secret identity.
- Outbound auth resolver with hook-level fallback to `Integration.config`.
- SyncLog rule enforced for every integration touchpoint.
- Removed dead `ConnectionTest` model and mocked `IntegrationsBoard`.

### UI pages
- Dashboard with live KPIs and pending approvals panel.
- Approvals inbox + `/approvals/:token` review page.
- Users page built on `User` interfaces.
- OAuth settings page.

### Fake data
- End-to-end coherent runs via real engine path.
- Added VHRS integration scenario: integration, hooks, approval tools, decision maps, and VHRS-shaped payloads.

### Tests
- Added Playwright e2e suite (auth, navigation, dashboard) with 14 passing tests.
- Added UI `aria-label`s and `data-testid`s for testability.

---

*Last updated after: VHRS fake data, Playwright e2e suite, login verification.*
