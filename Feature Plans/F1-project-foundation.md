# F1 — Project Foundation (app shell, API skeleton, shared conventions)

> Implementation plan. Source: GM Vault project spec (Sep 26, 2026), "MVP core features" §8 (Responsive design), plus the Group 3 whiteboard frontend wireframe.

## Metadata

| Field | Value |
|---|---|
| **Feature ID** | F1 |
| **Section** | Infrastructure / supporting |
| **Severity** | BLOCKER |
| **Markets** | N/A (course project; one audience: tabletop GMs and their players) |
| **Status (today)** | MISSING |
| **Estimated effort** | S (1w) |
| **Owner (proposed)** | Whole team, day 1–2; then 1 backend + 1 frontend finish it (names TBD on whiteboard "Group Roles") |
| **Depends on** | none |
| **Unblocks** | F2, F3, F4, F5, F6, F7, F8, F9, F10 |

---

## 1. Problem Statement

Nothing exists yet. Four people will build nine features in parallel. Without one shared app shell, API skeleton, error format and database connection, each feature will invent its own and the pieces won't fit together. This feature sets up the base every other plan relies on. It has no user-facing features of its own beyond the layout.

## 2. Goals

- One repo that runs the frontend and the API with a single documented command each.
- An app shell matching the whiteboard wireframe: header (search icon, "Campaigns" link, "Login" link), body content area, footer "Group 3 © 2026".
- A shared API error format and a 404 fallback that every later feature reuses.
- A working database connection with one health-check endpoint, so later features only add models.
- A layout that works from 360 px phone width up to desktop.

## 3. Non-Goals

- Choosing the full stack in this document. The team picks it at the bakeoff, and the plan stays stack-neutral (see §18).
- Any real data model (users, campaigns, etc.). Those come in F2+.
- CI/CD and production hosting. Local dev only for MVP; deployment is an open question.
- Dark mode, theming, i18n (spec "Additional features" #7).

## 4. Personas & User Stories

- **As a developer on the team**, I want to clone the repo and run it with one command so that I can start my feature the same day.
- **As a developer**, I want one error helper and one response format so that the frontend can show API errors the same way everywhere.
- **As a GM on a phone at the table**, I want the header and footer to fit a 360 px screen so that I can navigate without horizontal scrolling.

## 5. Functional Requirements

- **FR-1.** The repo MUST contain a `README.md` with setup steps, required environment variables (listed in `.env.example`), and the commands to start the API and the frontend.
- **FR-2.** The API MUST serve all routes under the `/api` prefix and return JSON (`Content-Type: application/json`).
- **FR-3.** The API MUST expose `GET /api/health` returning `200 { "status": "ok", "db": "up" }` when the database is reachable, and `503 { "status": "degraded", "db": "down" }` when it is not.
- **FR-4.** Every API error MUST use the envelope `{ "error": { "code": "<UPPER_SNAKE>", "message": "<human text>" } }` with status 400, 401, 403, 404, 409, 429 or 500.
- **FR-5.** Unknown `/api/*` routes MUST return `404 { error: { code: "NOT_FOUND", ... } }`.
- **FR-6.** Unhandled server exceptions MUST return `500 { error: { code: "INTERNAL", message: "Something went wrong" } }` and MUST NOT include stack traces in the response body.
- **FR-7.** The API MUST provide a shared validation helper that returns `400 VALIDATION_ERROR` with a `fields` object (`{ error: { code, message, fields: { title: "Required" } } }`).
- **FR-8.** List endpoints built in later features MUST accept `?page=` (default 1) and `?limit=` (default 20, max 100) and return `{ data: [...], page, limit, total }`. F1 provides the helper.
- **FR-9.** The frontend MUST render a shell with: header (search icon button, "Campaigns" link, "Login" link), a `<main>` content area, and footer text "Group 3 © 2026".
- **FR-10.** The frontend MUST have a client-side router with a "Page not found" view for unknown paths.
- **FR-11.** The frontend MUST provide one shared API client that parses the error envelope and exposes `{ code, message, fields }` to pages.
- **FR-12.** The frontend SHOULD provide shared `Loading`, `EmptyState` and `ErrorMessage` components so every feature uses the same states.
- **FR-13.** The header MAY collapse into a menu button below 480 px.

## 6. Non-Functional Requirements

- **Performance** — `GET /api/health` p95 < 200 ms locally. First page load < 3 s on a throttled "Fast 3G" profile.
- **Security** — secrets only in `.env` (git-ignored); `.env.example` has placeholder values. CORS limited to the frontend origin. Security headers on (e.g. via a helmet-style middleware).
- **Privacy & Compliance** — N/A for F1: no personal data stored yet.
- **Accessibility** — shell uses landmark elements (`header`, `nav`, `main`, `footer`). Search icon button has `aria-label="Search"`. Color contrast ≥ 4.5:1.
- **Scalability** — N/A: class project, < 50 users expected.
- **Reliability** — API starts even if the DB is down, and reports it via `/api/health` instead of crashing.
- **Observability** — each request logs method, path, status and duration. Errors log the stack trace server-side only.
- **Maintainability** — linter + formatter config committed; folder structure documented in README (routes, models, middleware / pages, components, services).
- **Internationalization** — N/A for MVP (English only); spec "Additional features" #7 is later.
- **Backward compatibility** — N/A: first release.

## 7. Acceptance Criteria

- **AC-1.** *Given* a fresh clone and a filled-in `.env`, *When* a teammate runs the documented install and start commands, *Then* the API and frontend both start with no errors.
- **AC-2.** *Given* the database is running, *When* a client calls `GET /api/health`, *Then* the response is `200` with `{ "status": "ok", "db": "up" }`.
- **AC-3.** *Given* the database is stopped, *When* a client calls `GET /api/health`, *Then* the response is `503` with `"db": "down"` and the API process keeps running.
- **AC-4.** *Given* any path such as `/api/does-not-exist`, *When* it is requested, *Then* the response is `404` with `error.code = "NOT_FOUND"`.
- **AC-5.** *Given* a route that throws an unexpected error, *When* it is called, *Then* the response is `500` with `error.code = "INTERNAL"` and the body contains no stack trace.
- **AC-6.** *Given* the app is open at 360 px wide, *When* any page renders, *Then* the header, main area and footer are visible with no horizontal scrollbar.
- **AC-7.** *Given* the user visits `/some/unknown/page`, *When* the router resolves it, *Then* a "Page not found" view with a link to "Campaigns" is shown inside the shell.

## 8. Data Model

- No business tables yet. F1 only sets up the database connection and the migration/seed mechanism the chosen stack uses.
- Convention for every later model: `id` (primary key), `createdAt`, `updatedAt` (ISO 8601, UTC, set by the server).
- Migrations/seeds live in one folder (e.g. `server/migrations/` or `server/seeds/`), numbered `NNN_description`.
- Backfill: N/A, no existing rows.

## 9. API Surface

| Verb | Path | Auth | Response |
|---|---|---|---|
| GET | `/api/health` | none | `200 { status: "ok", db: "up" }` / `503 { status: "degraded", db: "down" }` |
| * | `/api/*` (unmatched) | none | `404 { error: { code: "NOT_FOUND", message } }` |

```ts
// Shared error shape used by every feature
type ApiError = { error: { code: string; message: string; fields?: Record<string, string> } };
// Shared list shape used by every list endpoint
type Page<T> = { data: T[]; page: number; limit: number; total: number };
```

- WebSocket events: none.
- Rate limits: none in F1 (login rate limit is added in F2).
- OpenAPI: SHOULD start an `docs/api.md` (or OpenAPI file) that each feature appends to.

## 10. UI / UX

- **New components:** `AppShell` (header/main/footer), `Header`, `Footer`, `Loading`, `EmptyState`, `ErrorMessage`, `NotFoundPage`.
- **Header contents (from wireframe):** left: search icon button + "Campaigns" link; right: "Login" link. F2 replaces "Login" with the user menu when signed in. F10 wires the search icon.
- **Key flows:**
  1. User opens `/` → shell renders → placeholder home text "Sign in to see your campaigns".
  2. User opens an unknown path → `NotFoundPage` inside the shell.
- **States:** `Loading` = centered spinner with `role="status"` and text "Loading…"; `EmptyState` = icon + message + optional action button; `ErrorMessage` = `role="alert"` box showing `error.message` with a "Try again" button.
- **Responsive:** single-column body at < 768 px; content max-width ~1100 px on desktop. Tap targets ≥ 44×44 px.
- **Accessibility:** "Skip to main content" link as first focusable element; visible focus ring.
- **Copy:** footer "Group 3 © 2026"; not-found "We couldn't find that page."

## 11. AI / ML Considerations

N/A — this feature has no AI or ML parts.

## 12. Integration Points

- External services: database server only.
- Internal modules created: API entry point, error middleware, validation helper, pagination helper; frontend router, API client, shared state components.

## 13. Dependencies & Sequencing

- Must ship after: none.
- Must ship before: all other features (F2–F10).
- Shared infra needed: database instance (local or free cloud tier), `.env` handling.

## 14. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Stack not agreed, so F1 starts late | M | H | Decide stack at the bakeoff; F1 is time-boxed to 2 days for the skeleton. |
| Teammates' local DB setups differ | M | M | One documented setup (or one shared free-tier DB) in README; `/api/health` shows quickly whether it works. |
| Each feature invents its own error format anyway | M | M | Code review checklist item: "uses shared error helper". |

## 15. Rollout Plan

- Feature flag: none (infrastructure).
- Sequencing: repo + linters → API skeleton + error middleware → DB connection + health → frontend shell → README.
- Pilot: every teammate runs AC-1 on their own machine before F2 starts.
- Done criteria: AC-1 through AC-7 pass on all four machines.
- Rollback: N/A (first commit on `main`).

## 16. Test Plan

| AC | Test | Type |
|---|---|---|
| AC-1 | Each teammate follows README on a fresh clone; checklist signed off | Manual |
| AC-2 | `GET /api/health` with DB up → 200, body matches | API integration |
| AC-3 | Stop DB / point to bad URL → 503, process still serving | API integration |
| AC-4 | `GET /api/does-not-exist` → 404 `NOT_FOUND` | API integration |
| AC-5 | Test-only route that throws → 500 `INTERNAL`, no `stack` in body | API integration |
| AC-6 | Render shell at 360 px; assert `scrollWidth <= clientWidth` | E2E (Playwright or equivalent) |
| AC-7 | Navigate to `/nope` → "We couldn't find that page." visible | E2E |

- **Unit** — validation helper (`fields` map), pagination helper (defaults, `limit` capped at 100).
- **Security** — confirm `.env` is git-ignored; CORS rejects another origin.
- **Accessibility** — axe scan on shell: 0 serious/critical issues.
- **Performance / load** — N/A beyond the health p95 check.
- **Manual exploratory** — resize from 360 px to 1440 px; tab through header.

## 17. Documentation & Training

- `README.md`: setup, env vars, commands, folder layout.
- `docs/api.md`: error envelope, pagination shape, health route.
- End-user / admin docs: N/A for infrastructure.

## 18. Open Questions

1. Which stack (frontend framework, API framework, database) wins the bakeoff? Owner: whole team.
2. Shared cloud DB or everyone runs it locally? Owner: backend pair.
3. Will we deploy the MVP anywhere for grading, or demo locally? Owner: whole team, ask instructor.

## 19. References

- GM Vault project spec — "MVP core features" #8, "API endpoints" (error format, pagination).
- Group 3 whiteboard — "Frontend Wireframe (so far)".
- Related plans: all F2–F10 rely on this.
