# F4 — Campaign CRUD and Dashboard

> Implementation plan. Source: GM Vault project spec (Sep 26, 2026), "MVP core features" §3; Group 3 whiteboard "Campaigns" model, "Main Functions → Campaigns: create one, manage", and the second wireframe ("Campaigns" page).

## Metadata

| Field | Value |
|---|---|
| **Feature ID** | F4 |
| **Section** | Campaigns |
| **Severity** | BLOCKER |
| **Markets** | N/A (course project) |
| **Status (today)** | MISSING |
| **Estimated effort** | S (1w) |
| **Owner (proposed)** | 1 backend + 1 frontend (names TBD) |
| **Depends on** | F2 |
| **Unblocks** | F5 (and through it F6–F10) |

---

## 1. Problem Statement

A campaign is the container for everything else: NPCs, encounters, session notes and chat all belong to one. Right now a GM has nowhere to create one. This feature lets a GM create, view, edit and delete their campaigns and see them all on a dashboard. It is the first full CRUD flow behind login.

## 2. Goals

- A logged-in user can create a campaign and becomes its GM.
- The `/campaigns` dashboard lists the user's campaigns, newest first.
- The GM can edit the title, description and tags, and delete the campaign (with all its contents).
- Nobody except the GM can see or change the campaign (F5 later opens read access to players).

## 3. Non-Goals

- **Adding players.** That's F5.
- **Archive status, cover image, last-played date, game system** (spec fields). Not on the team whiteboard; post-MVP.
- Duplicating/templating campaigns.
- Searching the dashboard (F10 adds the filter).

## 4. Personas & User Stories

- **As a GM**, I want to create a campaign with a title, description and tags so that I can organize my game.
- **As a GM with several games**, I want a dashboard of all my campaigns so that I can jump into the one I'm running tonight.
- **As a GM**, I want to edit a campaign's description as the story changes.
- **As a GM whose game ended**, I want to delete the campaign and everything in it so that my dashboard stays clean.

## 5. Functional Requirements

- **FR-1.** `POST /api/campaigns` MUST create a campaign from `title` (1–100 chars, trimmed, required), `description` (0–2000 chars) and `tags` (0–10 strings, each 1–30 chars), and set `gmId` to the current user.
- **FR-2.** Tags MUST be trimmed, lowercased and de-duplicated before saving.
- **FR-3.** `GET /api/campaigns` MUST return the campaigns where the current user is GM, sorted by `createdAt` descending, paginated (F1 helper), each with `role: "gm"`. (F5 adds player campaigns with `role: "player"` to the same list.)
- **FR-4.** `GET /api/campaigns/:id` MUST return the campaign to its GM. To anyone else it MUST return `404 NOT_FOUND` (not 403, so campaign ids don't leak). F5 extends this to players.
- **FR-5.** `PATCH /api/campaigns/:id` MUST let only the GM change `title`, `description` and `tags` with FR-1/FR-2 rules; `gmId`, `id` and timestamps MUST NOT be changeable.
- **FR-6.** `DELETE /api/campaigns/:id` MUST let only the GM delete the campaign, and MUST delete its NPCs, encounters, session notes and chat messages in the same transaction (rules added as F6–F9 land). Returns `204`.
- **FR-7.** A malformed `:id` MUST return `404 NOT_FOUND`, not `500`.
- **FR-8.** The dashboard MUST show each campaign's title, first 140 chars of description, tags and created date, with a "New campaign" button.
- **FR-9.** The frontend MUST require typing the campaign title to confirm delete.
- **FR-10.** A user SHOULD be limited to 50 campaigns; the 51st returns `409 CAMPAIGN_LIMIT`.

## 6. Non-Functional Requirements

- **Performance** — dashboard list p95 < 300 ms for 50 campaigns.
- **Security** — every route uses `requireAuth`; ownership checked on the server for every read/write (never trust a client-sent `gmId`). Output is escaped when rendered (no HTML in descriptions).
- **Privacy & Compliance** — campaigns are private to their GM (and later their players).
- **Accessibility** — campaign cards are links with the title as accessible name; tag chips are plain text, not buttons.
- **Scalability** — index on `gmId`.
- **Reliability** — cascading delete is one transaction (FR-6).
- **Observability** — log create/delete with campaign id and user id.
- **Maintainability** — the "load campaign and check access" step is one helper (`loadCampaignForUser`) that F5 extends and F6–F10 reuse.
- **Internationalization** — N/A for MVP. Dates shown with the browser's locale.
- **Backward compatibility** — N/A (new table).

## 7. Acceptance Criteria

- **AC-1.** *Given* a logged-in user, *When* they submit title "Curse of Strahd", description "Gothic horror" and tags `[" Horror", "horror", "5e"]`, *Then* the API returns `201` with `gmId` = their id and `tags = ["horror", "5e"]`.
- **AC-2.** *Given* a logged-in user, *When* they submit a blank title or 11 tags, *Then* the API returns `400 VALIDATION_ERROR` with `fields.title` or `fields.tags`.
- **AC-3.** *Given* a user who GMs campaigns A (older) and B (newer) and another user who GMs C, *When* the first user opens `/campaigns`, *Then* they see B then A, each marked as GM, and never C.
- **AC-4.** *Given* campaign C belongs to another user, *When* the first user calls `GET`, `PATCH` or `DELETE /api/campaigns/C`, *Then* each returns `404 NOT_FOUND` and C is unchanged.
- **AC-5.** *Given* the GM of a campaign, *When* they PATCH the title to "Strahd Act II", *Then* the API returns `200` with the new title and a later GET returns it.
- **AC-6.** *Given* the GM, *When* they PATCH `gmId` to someone else's id, *Then* `gmId` is unchanged.
- **AC-7.** *Given* a campaign with NPCs, an encounter, notes and chat messages, *When* the GM deletes it, *Then* the API returns `204` and none of those child records exist afterwards.
- **AC-8.** *Given* a new user with no campaigns, *When* they open `/campaigns`, *Then* they see the empty state "No campaigns yet" with a "Create your first campaign" button.
- **AC-9.** *Given* `GET /api/campaigns/not-a-real-id`, *When* called by a logged-in user, *Then* the API returns `404`, not `500`.

## 8. Data Model

**Campaign** (new)

| Field | Type | Rules |
|---|---|---|
| `id` | PK | |
| `title` | string | 1–100 |
| `description` | string | 0–2000, default `""` |
| `gmId` | FK → User | required, indexed |
| `tags` | string[] | 0–10, each 1–30, lowercased |
| `playerIds` | FK[] → User | added in F5 (default empty) |
| `createdAt`, `updatedAt` | datetime | |

Changes from the whiteboard, decided on review:
- `campaignId` dropped: it duplicated `id`.
- `npcsId[]` dropped: NPCs already store `campaignId`, so the list comes from a query. Two copies would drift.
- `date` → `createdAt`.
- `pcIds` → renamed `playerIds` in F5, because it holds **user** ids, not character ids.

Migration: `004_create_campaigns`. Backfill: none.

## 9. API Surface

| Verb | Path | Auth | Success | Errors |
|---|---|---|---|---|
| GET | `/api/campaigns?page=&limit=` | session | `200 Page<CampaignSummary>` | 401 |
| POST | `/api/campaigns` | session | `201 Campaign` | 400, 401, 409 |
| GET | `/api/campaigns/:id` | GM (F5: member) | `200 Campaign` | 401, 404 |
| PATCH | `/api/campaigns/:id` | GM | `200 Campaign` | 400, 401, 404 |
| DELETE | `/api/campaigns/:id` | GM | `204` | 401, 404 |

```ts
type CampaignInput = { title: string; description?: string; tags?: string[] };
type Campaign = { id: string; title: string; description: string; tags: string[];
                  gmId: string; createdAt: string; updatedAt: string; role: "gm" | "player" };
type CampaignSummary = Pick<Campaign, "id" | "title" | "tags" | "createdAt" | "role"> & { descriptionPreview: string };
```

## 10. UI / UX

- **New pages:** `/campaigns` (dashboard), `/campaigns/new`, `/campaigns/:id` (overview with tabs placeholder for NPCs, Encounters, Notes, Chat, Players), `/campaigns/:id/edit`.
- **Header:** "Campaigns" link goes to `/campaigns`.
- **Flows:**
  1. Create: Dashboard → "New campaign" → form (title, description, tags as comma-separated input shown as chips) → Save → redirect to `/campaigns/:id`.
  2. Edit: Campaign overview → "Edit" (GM only) → same form prefilled → Save → back to overview with toast.
  3. Delete: Edit page → "Delete campaign" → dialog "Type *Curse of Strahd* to confirm" → Delete → back to dashboard with toast.
- **States:**
  - Loading: skeleton cards on dashboard; `Loading` on overview.
  - Empty: AC-8 empty state.
  - Error: `404` → "This campaign doesn't exist or you don't have access." with link to dashboard; other errors → `ErrorMessage` with retry; form errors inline.
- **Responsive:** dashboard grid = 1 column < 600 px, 2 columns ≥ 600 px, 3 columns ≥ 1000 px. Overview tabs become a horizontally scrollable tab bar on phones.
- **Accessibility:** tabs use `role="tablist"`; confirm dialog traps focus; Delete button disabled until the title matches.

## 11. AI / ML Considerations

N/A — this feature has no AI or ML parts.

## 12. Integration Points

- Internal: F2 `requireAuth`; F1 pagination/validation/error helpers; exports `loadCampaignForUser(campaignId, user)` used by F5–F10.
- External: none.

## 13. Dependencies & Sequencing

- Must ship after: F2.
- Must ship before: F5–F10.
- Can run in parallel with F3.

## 14. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cascade delete misses a child table added later | M | H | FR-6 lists each child; F6–F9 plans each add their table to the cascade and a test to AC-7. |
| Ownership check forgotten on one route | M | H | All routes go through `loadCampaignForUser`; AC-4 tests every verb. |
| Tag input UX takes longer than expected | M | L | MVP uses a comma-separated text box rendered as chips; fancier input later. |

## 15. Rollout Plan

- Flag: none.
- Sequencing: migration → API routes + `loadCampaignForUser` → dashboard → create/edit forms → delete dialog.
- Seed script adds two sample campaigns for `gm@example.com`.
- Done: AC-1 to AC-9 pass.
- Rollback: revert merge and drop the table.

## 16. Test Plan

| AC | Test | Type |
|---|---|---|
| AC-1 | POST valid campaign → 201, tags normalized | API integration |
| AC-2 | Blank title / 11 tags → 400 with fields | API integration |
| AC-3 | Two users seeded; list returns only own, newest first, `role: "gm"` | API integration + E2E |
| AC-4 | Other user's id with GET/PATCH/DELETE → 404 each; DB unchanged | API integration (authz matrix) |
| AC-5 | PATCH title → 200; GET shows new title | API integration |
| AC-6 | PATCH `gmId` → ignored | API integration |
| AC-7 | Seed children, DELETE → 204; count children = 0 | API integration |
| AC-8 | New user dashboard shows empty state + button | E2E |
| AC-9 | Malformed id → 404 | API integration |

- **Unit** — tag normalization; description preview truncation.
- **Security** — authz matrix (GM / other user / signed out) × 5 routes.
- **Accessibility** — axe on dashboard and form; keyboard create flow.
- **Manual exploratory** — 100-char titles at 360 px; emoji in tags.

## 17. Documentation & Training

- `docs/api.md`: campaign routes and `CAMPAIGN_LIMIT`.
- README: what the seed script creates.

## 18. Open Questions

1. Do we want "archive" instead of hard delete so a GM can't lose a year of notes by accident? (Spec has it; cut for MVP.) Owner: team.
2. Is 50 campaigns per user a sensible cap? Owner: backend pair.

## 19. References

- GM Vault spec — "Campaigns and members" endpoints, Campaign model.
- Group 3 whiteboard — Campaigns model and "Campaigns" wireframe.
- Related plans: F2, F5, F6, F7, F8, F9, F10.