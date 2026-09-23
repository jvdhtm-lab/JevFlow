# JevFlow – Agent Notes

## Tech Stack

- Backend: Django 3.2.4 + DRF + drf-yasg (`/swagger.json`), postgres:15, redis:7
- Frontend: React 18, TypeScript, Vite, MUI (`#0AA2A2` primary, `#7C3AED` accent), ReactFlow
- Proxy: Express (macaco :4001) + Passport (local/google/outlook/slack) + Redis sessions
- Data: custom DataLayer with 5s request dedup, React Context cache

## URL Flow (VHRS shape)

Browser calls `/api/<route>/` (or `/auth/*`). Vite (`vite.config.ts`,
`hmr.overlay: false`) proxies both to macaco. DataLayer prepends `/api`
except for `/auth/*`. Macaco strips `/api` and forwards to Django, which
serves resources at ROOT (`path('', include(...))`), adding
`Authorization: Token <token>` from the session. So
`/api/decision-map/` → macaco → `GET <django>/decision-map/`.

```
Browser (trampoline :5174)
  → macaco :4001 (strip /api, Token header, serves dist)
  → Django :8081 (root-mounted API, runserver, /swagger.json v2)
  → Postgres :5432 + Redis :6379 (cache + sessions)
```

## Structure

```
JevFlow/
  JevCore/                    # Django backend (apps mounted at ROOT)
    JevCore/urls.py           # path('', include(...)) per app + /auth/login/ view
    decisions/                # DecisionMap/Node/Edge/Run, save-graph/, import-yaml/
    jev_engine/               # engine presets/calls, /jev/decide/
    integrations/ identity_api/ audit/ notifications/ base/ api_doc/
  JevFlow-frontend/           # npm workspaces monorepo
    apps/macaco/              # Express proxy (:4001) + Passport + Redis sessions
    apps/trampoline/          # Vite React SPA dev server (:5174), proxy -> :4001
    packages/cli/             # Swagger -> resources codegen
    packages/resources/       # Generated API resources + RequestType interface
    packages/user-interfaces/ # Annotated UI, Dynamics, connect layer, DataCache
      lib/main.ts             # package entry (re-exports ../src/...)
      src/connect/            # axios instance + dataLayerObj (VHRS shape)
      src/context/DataCache.tsx # state/dispatch split cache
```

Ports shifted from VHRS (VHRS occupies :8080/:4000/:5173):
**Django :8081, macaco :4001, Vite :5174.** DB :5432, Redis :6379.

## Frontend build & workspaces (VHRS-aligned)

Workspaces root `JevFlow-frontend` symlinks `node_modules/@vhrs/{resources,user-interfaces}`.

- `packages/resources/package.json`: `main`/`types` → `src/index.ts`; `exports`
  maps import→src; scripts `build` = `clean && build:esm && build:cjs`. TypeScript
  resolves **source** (never a stale `dist/*.d.ts`). `src/connect/index.ts` holds
  only the `RequestType` interface (no DataLayer there).
- `packages/user-interfaces/package.json`: `"type": "module"`,
  `main` = `./dist/user-interfaces.js`, `types` = `./dist/lib/main.d.ts`,
  `build` = `tsc -p ./tsconfig-build.json && vite build`; devDeps include `vite-plugin-dts`.
- `packages/user-interfaces/vite.config.ts`: `dts({ include: ["lib","src"] })`,
  lib entry `lib/main.ts`, `formats: ["es"]`, externals react / `@mui/*` / `@vhrs/resources`.
- `packages/user-interfaces/tsconfig-build.json`: `{extends: ./tsconfig.json, include: ["lib"]}`.
- Trampoline `vite.config.ts` has **NO `resolve.alias`** (resolution via package.json),
  `hmr.overlay: false`, proxy `/api` + `/auth` → `http://localhost:4001`.
- Dev server loads `@vhrs/user-interfaces` from `dist/user-interfaces.js` and
  HMR-updates it after a rebuild; trampoline source is HMR'd directly. So after
  editing `packages/user-interfaces/src/**`, run its `npm run build` to refresh dist.

### RULE: always build user-interfaces, trampoline uses the built output

Trampoline never consumes `packages/user-interfaces/src` directly — it resolves
`@vhrs/user-interfaces` to `dist/user-interfaces.js` (built). Workflow for ANY
user-interfaces change (annotates, theme, Dynamics, `components/<Model>/*`,
`lib/main.ts`):
1. `cd packages/user-interfaces && npm run build` (tsc + vite → `dist/`).
2. Verify the export is in dist (e.g. `WebhookEndpointForm` in
   `dist/user-interfaces.js`) and dist is newer than the edited source.
3. Only then check trampoline (`tsc`, `vite build`, dev-server fetch).
Skipping the build means trampoline silently keeps serving the stale bundle.

## Auth

Providers: local (email/password), google, github, x, outlook (azure-ad), slack.
All strategies POST/verify then call Django `/auth/login/` (local) or
`/auth/social/` (providers) and store `{ user, token }` in express-session
(Redis-backed, 7-day cookie). DataLayer adds `Token <token>` header.
401 clears localStorage + dispatches `auth:logout`.

### Social login (keys in Django, session in Django)

OAuth client keys live in Django (`identity_api.OAuthProvider`, one row per
provider, seeded inactive at startup; `client_secret` write-only). Macaco
fetches them server-to-server at boot with `API_TOKEN` (root service token,
printed by `create_superuser.py`, stored in `apps/macaco/.env`) and falls back
to env vars only when Django has no keys. The Login page shows only providers
that are configured (from public `GET /auth/providers/`).

`POST /auth/social/` (service-token only) takes the proxy-verified profile and:
first login creates the user (unusable password, `auth_provider` set) +
`SocialAccount` link + tenant `Account` + Owner RWD `Role` rows for every App
entity; returning users (by `provider_uid`, else email) just log in. Always
updates tokens, records a `Login` row, and returns `{message, token, user}` —
the same shape as `/auth/login/`, stored in the macaco session.
X exposes no email, so macaco synthesizes `<username>@x.local` (same fallback
pattern for GitHub private emails).
Keys page: `/settings` (`OAuthSettings`, per-provider cards) — restart macaco
after changing keys (strategies load at boot).

## Jev Engine

- `choice(options, weights)` – weighted pick
- `noul(signal)` – novelty/noul score helper
- `score(features)` – weighted priority score
- Runs persist as `DecisionRun` + `EngineCall`; hot state in Redis.

## Decision Map editor (ReactFlow)

`apps/trampoline/src/components/DecisionMapEditor/` at `/maps/:id`. The node
inspector edits `config` per `node_type` via structured editors plus an
advanced JSON mirror:

- `trigger` → `event` (webhook | manual | schedule | …)
- `rule` → **noul**: `qtype: "noul"`, `instructions` (proposition text)
- `classification` / `decision` → **choice**: `qtype: "choice"`,
  `criteria.options: string[]`, `criteria.keywords: { option: [kw, …] }`
- `prioritization` → **score**: `qtype: "score"`,
  `rubric.weights: { criterion: 0..1 }`, `rubric.keywords: { criterion: [kw] }`,
  `rubric.levels: [[threshold, label], …]`
  (engine default `[[80,"high"],[50,"medium"],[0,"low"]]`)
- `approval` → `tool`, `action`, `policy.deny_tools: string[]`, `policy.strict: bool`
- `action` / `webhook_out` → `action` (free label or `http_post`) + HTTP template button

The inspector holds a `nodeConfig` **draft object**; structured editors and the
JSON textarea both write through `updateConfig`, so the JSON always mirrors the
form. `Apply` writes the draft into `node.data.config` and marks dirty; the
"Save graph" button persists nodes/edges and the backend regenerates `spec_yaml`.

Engine contract (`JevCore/jev_engine/engine.py`): each option/criterion is
matched by its own tokens plus its `keywords` list (`evaluate_choice` /
`evaluate_score`); `rule` uses `config.instructions` as the proposition
(`evaluate_noul`). Keep configs in the shapes above.

## Integration hooks & auth (webhooks)

Two separate integration worlds — do not mix them:

- **User identity** (`identity_api`: `CustomUser.auth_provider`, `SocialAccount`,
  `Login`): where users come from (git / gmail / outlook / slack login).
  Nothing to do with webhooks.
- **Action/trigger integrations** (`integrations` app: `Integration` with
  `purpose='action_trigger'`): the customer's external systems that maps talk
  to. Only these own hooks.

A **WebhookEndpoint** is a defined hook with a **direction**:
- **`inbound`** — ONE fixed URL shared by every inbound hook:
  `POST /api/webhook-endpoint/receive/`. The per-customer `secret`
  (generated by us via `WebhookEndpoint.save()`, given to the customer) is the
  identity of the call. Bound to a **`trigger`** node via
  `config.webhook_endpoint = <id>`.
- **`outbound`** — URL + auth BOTH provided by the customer (`target_url` plus
  `auth_scheme`/`auth_username`/`auth_token`, falling back to
  `Integration.config`). Bound to an `action` / `webhook_out` node via
  `config.webhook_endpoint = <id>`; the bound hook's URL wins over any
  hand-written node `url`.

**Inbound auth** (`integrations.views._check_inbound_auth`): shared-secret header
(`X-JevFlow-Secret`), `Authorization: Bearer <secret>`, `?secret=`, or an
HMAC-SHA256 body signature (`X-Hub-Signature-256` / `X-Signature-256` /
`X-Jira-Signature` / `X-Signature`). The fixed-path receiver
(`WebhookEndpointViewSet.receive`, `AllowAny`) matches the hook by secret and
runs every active map whose trigger node is bound to it
(`jev_engine.views.run_map_for_trigger`), stamps `last_received_at`, writes a
`SyncLog`. The per-id `receive_for_id` route is a back-compat alias and rejects
outbound hooks (400).

**Outbound auth** (`jev_engine.views.build_auth_headers`): hook-level
`auth_scheme`/`auth_token` first, then `Integration.config`
(`access_token`/`bearer_token`/`bot_token` → Bearer;
`username|email` + `api_token|token`, or `username`+`password` → Basic), plus
`config.headers` defaults. Node `config.headers` override. The inbound hook
secret is **never** sent outbound.

Serializer extras on `/webhook-endpoint/`: `integration_name`,
`integration_type`, `integration_base_url`, `direction`, `inbound_url` (fixed,
inbound only), `outbound_url` (customer URL, outbound only), `auth_required`,
`outbound_auth` (`auth_token` is write-only). Filters: `IntegrationFilter`
(`purpose`, …), `WebhookEndpointFilter` (`direction`, …).

### SyncLog rule — always log integration traffic

Every integration touchpoint writes a `SyncLog` row (`direction` in/out,
`event_type`, `payload`, `result`, `error_msg`, `duration_ms`) — the audit
trail for all outside talk (VHRS equivalent: per-model audit via `AuditLog`).
- **Inbound**: `WebhookEndpointViewSet.receive` writes `direction='in'`,
  `event_type='webhook:<source>'` per accepted call.
- **Outbound**: `jev_engine.views._record_outbound_sync_logs` writes one
  `direction='out'`, `event_type='action:<node_key>'` row per fired/skipped
  action result, linked to the bound outbound hook's integration (falling back
  to the map's integration). Called from both `run_map_for_trigger` and
  `EngineCallViewSet.perform_create`.

### Terminology

- **inbound** = trigger receives a message on the one fixed hook URL; the
  customer secret says who sent it.
- **outbound** = action publishes/posts the result to the customer-provided
  outbound hook URL with the customer-provided auth.

## useRItem Pattern

```ts
const { data, total, fetchItems } = useRItem(resources.DecisionRun, {
  filter: { status: 'escalated' }, page: 1, pageSize: 20,
});
```

Never use raw fetch/axios/dataLayerObj in components — **only `useRItem`**,
no exceptions (this includes auth: login, logout, session check, and the
provider list all go through the hook). `url` option only for
single-item REST endpoints or `/auth/*` overrides. Generated files are never
hand-edited – use annotations.

Auth-via-hook mapping (`AuthContext`, `Login` component):
- login: `useRItem(resources._auth_, { url: "/auth/login/", fetchOnDeclare: false })` + `createItem({email, password})`
- logout: `useRItem(resources._auth_, { url: "/auth/logout", fetchOnDeclare: false })` + `createItem({})`
- session check: `useRItem(resources._auth_, { url: "/auth/me", fetchOnDeclare: false })` + `fetchItems(true)`
- provider buttons: `useRItem(resources.OAuthProvider, { url: "/auth/providers/", fetchOnDeclare: false })` + `fetchItems(true)`
Always pass `fetchOnDeclare: false` for auth hooks — otherwise the hook
auto-fires `fetchItems` on mount against the override URL.

### Hook contract (VHRS-shaped – do not drift)

`useRItem` intentionally mirrors the VHRS reference hook's behavior:

- **Argument order:** `fetchItem(force = false, id?)` – force FIRST, id SECOND.
  `fetchItems(force = false)`. Calling `fetchItem(mapId, true)` sends `id=true`
  → `/decision-map/true/` (404). Always `fetchItem(true, String(mapId))`.
- **Return values are raw axios responses**, not `{ total, nodes }`.
  Read the payload from `.data`: paginated lists are `.data.results`
  (DRF `{ count, next, previous, results }`), a single item is `.data`.
  Reactive consumers should prefer the hook's `data` (cache-backed) instead.
- **Stale handling:** `epochRef`/`mountedRef` (no `AbortController`) – superseded
  requests resolve to `undefined` instead of throwing `canceled`.
- **Cache:** `context/DataCache.tsx` splits `useDataCacheState` (`get`,
  `state`, `resourceVersions`) from `useDataCacheDispatch` (`set`,
  `updateNode`, `appendNode`, `invalidate`, `invalidateFiltered`,
  `mergeFiltered`, `bumpResourceVersion`). Cache keys are
  `resourceName` or `resourceName::hid({ url, filter, page, pageSize, sortBy })`.
- **connect layer:** `packages/user-interfaces/src/connect/` owns the axios
  instance (`baseURL: "/"`) and `dataLayerObj` (5s dedup, prepends `/api`
  unless the endpoint is `/auth/*`). `useRItem` imports it from `../../connect`,
  not from `@vhrs/resources`.

## Filtering Standard

Backend: every ViewSet defines `filterset_class` (explicit FilterSet in
`filters.py` with label/help_text so Swagger annotates each param) plus
`search_fields` / `ordering_fields` (SearchFilter + OrderingFilter on
BaseViewSet).
Frontend: `useRItem(res, { filter, page, pageSize })` builds
`?field=value&page=&page_size=`. No client-side filtering of lists.

## Codegen CLI (`packages/cli`) — working, VHRS-shaped

`npm run buildResources` in `packages/cli` = `tsc` build then `syncContexts`
(`node dist/index.js`), which fetches `${BASE_URL}/swagger.json` (default
`BASE_URL=http://localhost:8081`, overridable via env) and **writes** files —
it is not a stub. Ported from the working VHRS CLI (`findResourceModel`,
`generateResourceFile` incl. `convertNumericEnums`, filterable-from-LIST-params
and `x-vhrs-sortable` handling are verbatim).

JevFlow adaptations (documented, do not regress):
- `_auth_` group: `/auth/*` paths emit `_auth_.ts` (`baseUrl: "/auth/"`,
  `relatedurls: ["/auth/login/", "/auth/logout/"]`, fields from the `Login`
  definition) instead of a bogus `Login.ts`-from-auth collision.
- Lone action paths without a GET collection (e.g. `/jev/decide/`) are skipped.
- `relatedurls` stay `[base, base{id}]`; baseUrl is the collection path.
- `WRITE_ONLY_EXTRAS` in `generateResourceFile.ts` re-adds fields drf-yasg
  hides (currently `WebhookEndpoint.auth_token`); extend it if new write-only
  fields appear.
- `generateSchemas` emits `Models.ts` as individual interfaces + a
  `definitions` map (the shape `annotates/` consumes via
  `definitions['X']`), not openapi-typescript output.
- Barrel keeps the hand style (`export { X } from "./X"` + `resources`
  object); existing member order is preserved, new models appended.
- `packages/resources/src/types/index.ts` re-exports
  `definitions as Models` so generated `mockType`s typecheck.

### RULE: model change ⇒ syncContexts ⇒ rebuild chain

Every Django model/serializer/viewset change MUST be followed by regeneration —
never hand-edit files under `packages/resources/src/servers/`:
1. `cd packages/cli && npm run buildResources` (fetches live swagger from
   `:8081`, rewrites `<Model>.ts` resources + `Models.ts` + barrel).
2. `cd ../resources && npm run build`.
3. `cd ../user-interfaces && npm run build` (dist is what trampoline serves).
4. `cd ../../apps/trampoline && npx tsc --noEmit -p tsconfig.json` (and
   `npx vite build` when shipping dist).
Skipping step 1 leaves stale fields/columns/validations in every table, form,
and list. The generator owns those files; annotations own the presentation.

## Full-Stack Model Pattern

1. Django model (TenantBaseModel) 2. migration 3. serializer 4. ViewSet
   (BaseViewSet + filterset_fields) 5. URL route 6. run CLI
   (`npm run buildResources`) 7. annotation in `annotates/<model>.tsx`
8. register in `annotates/index.tsx` 9. component 10. route in `App.tsx`.

## Done (this session)

### Backend
- App URLconfs mounted at **root** (`path('', include(...))`) instead of `/api/`;
  `/auth/login/` stays a direct `LoginTokenView`. Swagger `default_version='v2'`.
- macaco `apiProxy` strips a leading `/api` and forwards unchanged otherwise;
  adds `Authorization: Token <token>` from the session + no-store cache headers.

### Frontend realigned to VHRS
- `useRItem` rewritten to VHRS shape: `epochRef`/`mountedRef` stale handling
  (removed `AbortController`, which caused `canceled` requests), `createItem`
  added back, imports `dataLayerObj` from `../../connect` and
  `useDataCacheState`/`useDataCacheDispatch`.
- New connect layer at `packages/user-interfaces/src/connect/`:
  `index.ts` (axios `baseURL:"/"` + `dataLayerObj`), `DataLayer.ts`
  (5s dedup, `/api` prefix, abort clears cache, `axios.isCancel` → `undefined`),
  `hash.ts` (default `hash(args)` + `hid(obj)`).
- `context/DataCache.tsx` split into state/dispatch contexts; added
  `context/hash.ts` (`hash` + `hid`).
- `packages/resources`: `src/connect/index.ts` reduced to the `RequestType`
  interface; package.json switched to source-pointing `main`/`types`/`exports`.
- `packages/user-interfaces`: VHRS build layout — root `lib/main.ts`,
  `vite-plugin-dts`, `tsconfig-build.json` (`include: ["lib"]`),
  `types: ./dist/lib/main.d.ts`.
- Trampoline `vite.config.ts` reduced to the minimal VHRS shape (no alias).

### Bug fixes
- `/api/decision-map/true/` **404** — `DecisionMapEditor` called
  `fetchItem(mapId, true)` but the signature is `fetchItem(force, id)`, so `id`
  became `true`. Fixed to `fetchItem(true, String(mapId))`.
- **Decision map not rendering** — editor read `nodeRes.nodes` / `edgeRes.nodes`,
  but `fetchItems` resolves to the raw axios response; nodes/edges were always `[]`.
  Fixed to read `.data.results` (DRF `{count,next,previous,results}`); single item
  from `.data`. (Remaining `sel.nodes` is ReactFlow selection — fine.)

### Decision Map editor — node config UI
- Added type-driven node config editors in the inspector: **choice** (options +
  keywords) for `classification`/`decision`, **noul** proposition for `rule`,
  weighted **score** rubric + levels for `prioritization`, plus `trigger` event,
  `approval` tool/action/deny-tools/strict, and `action`/`webhook_out` action.
- Inspector now edits a `nodeConfig` draft object; structured editors and the
  advanced JSON textarea both write through `updateConfig` so they always mirror
  each other. Fixed `DecisionMapsList` `deleteItem(String(mapId))` type error.

### Integration hooks — corrected architecture
- Split the two integration worlds: user identity (`identity_api`) vs
  action/trigger (`integrations.Integration.purpose`).
- Inbound = ONE fixed URL (`POST /api/webhook-endpoint/receive/`, collection
  action); per-customer secret generated in `WebhookEndpoint.save()` is the
  identity; `target_path` forced to the fixed path. Detail `receive_for_id`
  kept as back-compat alias.
- Outbound = customer-provided `target_url` + hook-level `auth_scheme` /
  `auth_username` / `auth_token` (write-only), falling back to
  `Integration.config`; bound hook URL always wins in the engine resolver.
- Migration `integrations/0003_*`; `IntegrationFilter(purpose)`,
  `WebhookEndpointFilter(direction)`; fake data reseeded (inbound: fixed path +
  unique secrets; outbound: customer URL + auth).
- SyncLog rule: every integration touchpoint logs — inbound `receive` writes
  `direction='in'`; `_record_outbound_sync_logs` (called from
  `run_map_for_trigger` and `EngineCallViewSet.perform_create`) writes one
  `direction='out'` row per action result.
- syncContexts now really emits files (was a stub): ported the working VHRS CLI
  modules; regenerated all 19 resources + Models.ts from live swagger; full
  chain green (resources → user-interfaces → trampoline tsc + vite build).
- Hooks only: removed the mocked `IntegrationsBoard` page + route + menu, and
  deleted the dead `ConnectionTest` model (migration `0004`, serializer /
  viewset / urls / filter / seeds removed, resources regenerated).
- Rule: every `action` / `webhook_out` node always binds an outbound hook —
  enforced in the editor (`Apply` + `Save graph` both refuse with the node
  keys listed). Sidebar entry renamed Webhooks → Hooks.
- Users are simple (no staff model): `annotates/user.tsx` enriched (colored
  icon, list item, password/switch/provider field renderers),
  `components/User/` interfaces (Table/List/Form + barrel, exported from
  `lib/main.ts`), trampoline `/users` uses `UsersPage` built on them.
  Removed dead `CustomUser.title` (migration `0003`, serializer/seed updated,
  resources regenerated).

### Notes / conventions

- Layering (VHRS pattern, no shortcuts): generated `resources` → `annotates/<model>.tsx`
  (helpers on top, theme colors only, `relatedFieldAnnotation` for FKs, `defaultActions`)
  → `components/<Model>/{<Model>Table,<Model>List,<Model>Form,index.tsx}` wrapping
  `Dynamic*` in `<Box sx={{ p: 3 }}>` with curated columns → trampoline consumes the
  interfaces (e.g. `WebhookEndpointForm`), never raw `DynamicForm` for domain forms.
  New interfaces are exported from `packages/user-interfaces/lib/main.ts`.
- Good-looking forms come from field annotations: per-field `display.components["field:<name>"]`
  renderers (password inputs, switches, labeled selects with helper text) plus polished
  `title`s — never hand-rolled inputs in trampoline dialogs.
- RULE: form inputs are annotated on the actual field —
  `<field>: { display: { components: { asFormInput: (value, { field, set }) => ... } } }`
  — the same level where `asTableCell`/`asFilter` live (which `DynamicTable`
  resolves from `field.display.components`). `DynamicForm` resolves
  `f.display.components.asFormInput` per field; resource-level
  `display.components["field:<name>"]` keys are forbidden (they bypass the
  documented pattern and were removed).
- Debug log left in `useRItem.tsx`: `[useRItem] fetchItems force=… url=…` —
  remove when no longer needed.
- Root page: `/maps/:id` = `DecisionMapEditor` (ReactFlow canvas), `/maps` =
  `DecisionMapsList`, `/runs` = `WorkflowRuns`.
- Docker: `jevflow_django` (:8081 healthy), `jevflow_app` (:4001),
  `jevflow_db` (:5432), `jevflow_redis` (:6379). Dev login `root@local.com` / `admin`.
