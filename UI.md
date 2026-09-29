# JevFlow – User Interface Guide

This document describes the screens and interactions a user sees in the JevFlow web application.

> **Stack in one sentence:** JevFlow is a decision-automation platform. You connect external systems, draw decision maps, and let the engine run them — with human approvals in the loop.

---

## Table of contents

1. [Common layout](#common-layout)
2. [Login](#login)
3. [Dashboard](#dashboard)
4. [Integrations](#integrations)
5. [Hooks](#hooks)
6. [Tools (Approval tools)](#tools-approval-tools)
7. [Decision Maps](#decision-maps)
   - [Map list](#map-list)
   - [Map editor](#map-editor)
8. [Runs](#runs)
9. [Approvals](#approvals)
   - [Approvals inbox](#approvals-inbox)
   - [Approval review link](#approval-review-link)
10. [Users](#users)
11. [Settings (OAuth providers)](#settings-oauth-providers)
12. [Common UI patterns](#common-ui-patterns)

---

## Common layout

After logging in, every page shares the same chrome:

- **Top AppBar** — JevFlow logo, global search box, notifications bell, and an account menu with *Profile* and *Logout*.
- **Left sidebar** — permanent navigation drawer with the main sections:
  - Dashboard
  - Integrations
  - Decision Maps
  - Runs
  - Approvals
  - Hooks
  - Tools
  - Users
  - Settings

The sidebar highlights the current section. Clicking a menu item navigates without a full page reload.

---

## Login

**Route:** `/login`

The login screen supports local email/password authentication and social login buttons. The available social providers depend on which OAuth keys are configured in **Settings**.

- Default dev credentials: `root@local.com` / `admin`.
- On successful login you are redirected to `/dashboard`.
- Failed attempts show a red error alert on the form.

---

## Dashboard

**Route:** `/dashboard`

The dashboard is the landing page after login. It gives a high-level overview of the tenant:

- **KPI cards** (clickable):
  - Decision maps — total number of maps.
  - Runs — runs today / total runs.
  - Pending approvals — number of open approval requests.
  - Hooks — inbound / outbound hook count.
- **Pending approvals panel** — lists the first few open approval requests with a *Review* button that opens the approval review page.
- **Recent runs panel** — shows the latest decision runs with status, route, confidence, and time ago. A *View all* button jumps to `/runs`.

All numbers are live and pulled from the backend.

---

## Integrations

**Route:** `/integrations`

Integrations are the external systems JevFlow talks to, grouped into three categories: **LLM**, **SaaS**, and **Messaging** (e.g. Jira, GitHub, AWS, Slack, Microsoft Teams, Codex, VHRS).

- **Table / List tabs** — switch between a tabular view and a list view of integrations.
- **Add Integration** button — opens a right-side drawer with a form to create a new integration.
- Each integration record stores:
  - Name and description
  - Purpose (Action/Trigger is the main one)
  - Integration type (`llm`, `saas`, or `messaging`)
  - Base URL
  - Connection status
  - Credentials hint

Hooks and approval tools are children of an integration.

---

## Hooks

**Route:** `/webhooks`

Hooks are the actual endpoints that receive or send messages.

- **Inbound hooks** — share one fixed system URL (`POST /api/webhook-endpoint/receive/`). Each hook has its own auto-generated secret; the caller sends the secret to identify itself. Bind these to the **trigger** node of a decision map.
- **Outbound hooks** — customer-provided URL + auth scheme (Bearer, Basic, or none). Bind these to **action** nodes so the map can post results back.

The page is a standard resource page: Table/List tabs, filters on direction, and a create drawer.

---

## Tools (Approval tools)

**Route:** `/tools`

Approval tools define the channels used to notify humans when a map reaches an **approval** node.

- **Tool type** — `email` or `message`.
- **Via** — how the notification is sent:
  - `integration` — uses the bound integration's credentials (e.g., Gmail, Outlook, Slack).
  - `hook` — posts through a bound outbound webhook endpoint.

The page shows Table/List tabs and an *Add Approval tool* drawer.

---

## Decision Maps

### Map list

**Route:** `/maps`

The map list shows every decision flow in the tenant.

- Columns: Name, Category, Version, Active status, YAML size.
- **New map** button — creates a blank map and immediately opens the graphical editor.
- **Open editor** button on each row — navigates to `/maps/:id`.
- **Delete** button — removes the map and all its nodes/edges after confirmation.

### Map editor

**Route:** `/maps/:id`

The editor is a ReactFlow canvas where you design the decision flow.

**Node types:**

| Node | Purpose |
|---|---|
| **Trigger** | Where the run starts. Its `event` field is the real event name the map listens for (e.g. `employee.hired`). The map-level **Category** field is the high-level trigger type: `webhook`, `manual`, `schedule`, or `event`. |
| **Rule** | A yes/no guard using a `noul` belief score. |
| **Classification** | Picks one category from options with keyword matching. |
| **Prioritization** | Scores input against weighted criteria and returns a level (high/medium/low). |
| **Decision** | Picks an action path from options with keyword matching. |
| **Approval** | Pauses the run and asks a human to approve/decline via a notification channel. |
| **Action** | Performs an outbound HTTP POST (or other action) using a bound outbound hook. |
| **LLM Agent** | Calls an LLM with a prompt and uses the answer in downstream nodes. |

**Editing a node:**

- Select a node to open the right-side inspector.
- Fill structured controls for the node type; a JSON mirror stays in sync.
- Click **Apply** to save the node config into the graph.
- Click **Save graph** to persist nodes/edges to the backend.

**Validation:**

- Every **action** node must be bound to an outbound hook. Save is refused until all action nodes are bound.
- The editor also supports a **Test** panel to run the map with a sample payload.

---

## Runs

**Route:** `/runs`

Runs show the execution history of decision maps, similar to a CI/CD pipeline view.

- **Filters** — filter by decision map (backend-side).
- **Refresh** button — reload the list.
- **Columns:** status, run ID + map name, trigger event preview, decided route, confidence, duration, finished time.
- **Re-run** button — executes the same map again with the original trigger state.
- **Run detail drawer** — clicking a run opens a side panel with:
  - Status, route, confidence, duration chips.
  - Step-by-step answers from each node.
  - Outgoing action results (HTTP method, URL, dry-run status, errors).
  - Raw trigger event JSON.
  - Raw answers log JSON.
  - A *Re-run* button inside the drawer.

---

## Approvals

### Approvals inbox

**Route:** `/approvals`

The approvals inbox lists human approval requests created by decision maps.

- Tabs: **Pending**, **Approved**, **Declined**, **All**.
- Clicking a row navigates to the review page for that request (using its unique token).
- Each row shows a summary, the map name, node key, and status.

### Approval review link

**Route:** `/approvals/:token`

A dedicated page for reviewing a single approval request. It can be opened from the inbox or directly from a notification/email link.

- Shows the approval summary and description.
- Displays the route and the answers/log that led to the request.
- **Approve** / **Decline** buttons.
- Once decided, the page shows the decision timestamp and disables the buttons.

---

## Users

**Route:** `/users`

Manage tenant users.

- Table/List tabs showing all users.
- **Add User** drawer with fields: email, username, first/last name, password, auth provider, active flag.
- Each user can authenticate locally or through a social provider.

---

## Settings (OAuth providers)

**Route:** `/settings`

Configure the social login providers available on the login page.

- One card per provider (Google, GitHub, X, Outlook, Slack).
- Shows whether the provider is configured.
- Fields:
  - **Client ID**
  - **Client secret** (write-only; leaving blank keeps the existing secret)
  - **Active** toggle
- **Save** button stores the keys in Django.
- **Important:** after changing OAuth keys, restart the macaco proxy container so Passport picks them up at boot.

---

## Common UI patterns

Many pages in JevFlow are generated from annotated resources and share the same patterns:

- **Table / List tabs** — switch between a dense data table and a card-style list.
- **Create drawer** — a right-side panel with a form for adding new records.
- **Row actions** — edit, delete, show, and custom actions per record.
- **Backend-side sorting and filtering** — tables sort by column headers and use server-side filters for enums, booleans, and related fields.
- **Forms** — generated forms handle text, email, password, booleans (switches), dates, date-times, integers, selects, JSON objects, and related-resource pickers.
- **Error handling** — backend validation errors appear as per-field helper text and a top-of-form alert.

These shared behaviors are provided by the `DynamicTable`, `DynamicList`, and `DynamicForm` components in `packages/user-interfaces`.

---

*Last updated: after VHRS fake-data, e2e tests, and AGENTS.md refresh.*
