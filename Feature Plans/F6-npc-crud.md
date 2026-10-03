# F6 — NPC CRUD

> Implementation plan. Source: Group 3 whiteboard "NPCs" model and "Main Functions → NPCs"; GM Vault project spec (Sep 26, 2026), "MVP core features" §4 (Characters, NPC part) and "Characters" endpoints.

## Metadata

| Field | Value |
|---|---|
| **Feature ID** | F6 |
| **Section** | Campaign content |
| **Severity** | MAJOR |
| **Markets** | N/A (course project) |
| **Status (today)** | MISSING |
| **Estimated effort** | S (1w) |
| **Owner (proposed)** | 1 backend + 1 frontend (names TBD) |
| **Depends on** | F5 |
| **Unblocks** | F8 (encounters reference NPCs), F10 |

---

## 1. Problem Statement

NPCs (shopkeepers, villains, quest-givers) are what a GM looks up most during a session, and today they live on sticky notes. GMs need one list per campaign with each NPC's name, role, description and tags, and a way to show some NPCs to players without spoiling the rest. This is the first content model under a campaign and the second full-CRUD model for grading.

## 2. Goals

- The GM can create, view, edit and delete NPCs in their campaign.
- The GM can mark an NPC revealed so players can see it; players see only revealed NPCs.
- The NPC list shows name, role and tags at a glance and can be filtered by tag.

## 3. Non-Goals

- **Stats / character sheets / game-system fields** (spec). Not on the whiteboard; post-MVP.
- **Portraits / image upload.** Post-MVP (same reason as F3).
- **PCs** (player characters). Not on the whiteboard.
- Importing monsters from game APIs (spec templates); post-MVP.
- Text search (F10 does it across all content).

## 4. Personas & User Stories

- **As a GM**, I want to add an NPC with a name, role, description and tags so that I can find them mid-session.
- **As a GM**, I want to edit an NPC as the story changes (e.g. role "ally" → "traitor").
- **As a GM**, I want to reveal an NPC once the party meets them so that players can look them up.
- **As a player**, I want to see the NPCs we've met so that I remember who's who.

## 5. Functional Requirements

- **FR-1.** `POST /api/campaigns/:id/npcs` (GM only) MUST create an NPC from `name` (1–100, required), `role` (0–60), `description` (0–5000), `tags` (0–10, same rules as F4) and `isRevealed` (boolean, default `false`).
- **FR-2.** `GET /api/campaigns/:id/npcs` (member) MUST return NPCs filtered by F5 `visibleTo` (players: revealed only), sorted by `name` ascending, paginated, and MAY accept `?tag=` to filter by one tag.
- **FR-3.** `GET /api/npcs/:npcId` (member) MUST return the NPC; a player requesting an unrevealed NPC MUST get `404 NOT_FOUND`.
- **FR-4.** `PATCH /api/npcs/:npcId` (GM only) MUST update any of the FR-1 fields with the same rules. `campaignId` MUST NOT be changeable.
- **FR-5.** `DELETE /api/npcs/:npcId` (GM only) MUST delete the NPC **and** remove its id from every encounter's `npcIds` in that campaign (F8) in one transaction. Returns `204`.
- **FR-6.** Player requests to POST/PATCH/DELETE MUST return `403 GM_ONLY`; non-members get `404`.
- **FR-7.** The response for players MUST NOT include `isRevealed` or any GM-only field (it would always be `true` anyway, and keeps the shape honest).
- **FR-8.** Deleting the campaign (F4) MUST delete its NPCs.
- **FR-9.** A campaign SHOULD be limited to 500 NPCs (`409 NPC_LIMIT`).
- **FR-10.** The GM list view SHOULD offer a one-click reveal/hide toggle per NPC.

## 6. Non-Functional Requirements

- **Performance** — list p95 < 300 ms for 500 NPCs (page size 20).
- **Security** — all access via F5 helpers; unrevealed NPCs filtered in the query, never in the frontend. Description rendered as plain text with line breaks (no HTML).
- **Privacy & Compliance** — N/A beyond campaign privacy.
- **Accessibility** — reveal toggle is a real switch (`role="switch"`, `aria-checked`) labelled "Visible to players".
- **Scalability** — indexes on `campaignId` and `(campaignId, name)`.
- **Reliability** — FR-5 is transactional.
- **Observability** — log create/delete with ids.
- **Maintainability** — NPC form component reused for create and edit.
- **Internationalization** — N/A for MVP.
- **Backward compatibility** — new table.

## 7. Acceptance Criteria

- **AC-1.** *Given* GM Ana's campaign, *When* she creates NPC "Ireena", role "Noble", tags `["barovia"]`, *Then* the API returns `201` with `isRevealed: false` and the NPC appears in her list.
- **AC-2.** *Given* the create form, *When* Ana submits without a name, *Then* the API returns `400` with `fields.name` and nothing is created.
- **AC-3.** *Given* NPCs "Ireena" (revealed) and "Strahd" (hidden), *When* player Ben lists NPCs, *Then* he sees only Ireena; *When* Ana lists them, *Then* she sees both.
- **AC-4.** *Given* "Strahd" is hidden, *When* Ben requests `GET /api/npcs/{strahdId}`, *Then* the API returns `404`.
- **AC-5.** *Given* Ana toggles "Strahd" to revealed, *When* Ben reloads the NPC list, *Then* Strahd appears.
- **AC-6.** *Given* Ben is a player, *When* he tries to create, edit or delete an NPC, *Then* each returns `403 GM_ONLY`.
- **AC-7.** *Given* NPC "Strahd" is in encounter "Castle Ambush", *When* Ana deletes Strahd, *Then* the API returns `204` and the encounter's `npcIds` no longer contains Strahd's id.
- **AC-8.** *Given* NPCs tagged "barovia" and "vallaki", *When* Ana filters by `tag=vallaki`, *Then* only the vallaki NPCs are returned.
- **AC-9.** *Given* a campaign with no NPCs, *When* Ana opens the NPCs tab, *Then* she sees "No NPCs yet" with an "Add NPC" button; a player sees "The GM hasn't revealed any NPCs yet."

## 8. Data Model

**NPC** (new)

| Field | Type | Rules |
|---|---|---|
| `id` | PK | |
| `campaignId` | FK → Campaign | required, indexed (whiteboard `campaignId*`) |
| `name` | string | 1–100 |
| `role` | string | 0–60 (free text, e.g. "Innkeeper") |
| `description` | string | 0–5000 |
| `tags` | string[] | 0–10, lowercased |
| `isRevealed` | boolean | default `false` (**added**, see F5 open question 1) |
| `createdAt`, `updatedAt` | datetime | whiteboard `date` → `createdAt` |

- Migration: `006_create_npcs`. Add NPCs to F4 campaign cascade delete.

## 9. API Surface

| Verb | Path | Auth | Success | Errors |
|---|---|---|---|---|
| GET | `/api/campaigns/:id/npcs?tag=&page=&limit=` | member | `200 Page<Npc>` | 401, 404 |
| POST | `/api/campaigns/:id/npcs` | GM | `201 Npc` | 400, 401, 403, 404, 409 |
| GET | `/api/npcs/:npcId` | member (revealed for players) | `200 Npc` | 401, 404 |
| PATCH | `/api/npcs/:npcId` | GM | `200 Npc` | 400, 401, 403, 404 |
| DELETE | `/api/npcs/:npcId` | GM | `204` | 401, 403, 404 |

```ts
type NpcInput = { name: string; role?: string; description?: string; tags?: string[]; isRevealed?: boolean };
type Npc = { id: string; campaignId: string; name: string; role: string; description: string;
             tags: string[]; isRevealed?: boolean /* GM only */; createdAt: string; updatedAt: string };
```

## 10. UI / UX

- **New:** "NPCs" tab on `/campaigns/:id`, `/campaigns/:id/npcs/new`, `/npcs/:npcId` (detail), `/npcs/:npcId/edit`.
- **Flows:**
  1. Add: NPCs tab → "Add NPC" → form (name, role, description, tags, "Visible to players" switch) → Save → detail page.
  2. Reveal: in the list, flip the "Visible to players" switch → optimistic update, reverted with an error toast if the PATCH fails.
  3. Edit/Delete: detail → Edit → Save, or Delete → confirm "Delete Strahd? This also removes him from encounters."
  4. Filter: tag chips above the list; clicking one filters, "All" clears.
- **States:**
  - Loading: list skeleton (5 rows); detail `Loading`.
  - Empty: AC-9 copy (GM vs player differ).
  - Error: 404 → "This NPC doesn't exist or isn't visible to you."; 403 → "Only the GM can do that."; form errors inline.
- **Responsive:** list rows (name bold, role muted, tags as chips) stack in one column; on ≥ 768 px, list and detail may show side by side.
- **Accessibility:** hidden NPCs show an eye-slash icon **and** the text "Hidden" (not icon only).

## 11. AI / ML Considerations

N/A — this feature has no AI or ML parts.

## 12. Integration Points

- Internal: F5 `loadCampaignForUser`, `visibleTo`; F4 cascade; F8 `npcIds` cleanup; F10 search reads this table.
- External: none.

## 13. Dependencies & Sequencing

- Must ship after: F5.
- Must ship before: F8, F10.
- Can run in parallel with F7 and F9.

## 14. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| F8 not built yet when NPC delete ships, so FR-5 cleanup has nothing to clean | H | L | Implement the cleanup when F8 lands; AC-7 test lives in F8's suite too. |
| Optimistic reveal toggle shows wrong state on failure | M | M | Revert on error + toast; E2E test with a forced 500. |
| Players see hidden NPCs through another route (search) | M | H | F10 must use `visibleTo`; shared authz test. |

## 15. Rollout Plan

- Flag: none.
- Sequencing: migration → routes using F5 helpers → list/detail → form → reveal toggle → tag filter.
- Seed: 3 NPCs (2 revealed, 1 hidden) in the sample campaign.
- Done: AC-1 to AC-9 pass.
- Rollback: revert; drop table.

## 16. Test Plan

| AC | Test | Type |
|---|---|---|
| AC-1 | GM POST → 201, `isRevealed: false` | API integration |
| AC-2 | Missing name → 400 `fields.name` | API integration |
| AC-3 | GM list = 2, player list = 1 | API integration |
| AC-4 | Player GET hidden id → 404 | API integration |
| AC-5 | GM toggles → player list includes it | E2E (two sessions) |
| AC-6 | Player POST/PATCH/DELETE → 403 | API integration (authz matrix) |
| AC-7 | NPC in encounter deleted → encounter `npcIds` updated | API integration (after F8) |
| AC-8 | `?tag=vallaki` → only matching | API integration |
| AC-9 | Empty campaign: GM copy vs player copy | E2E |

- **Unit** — NPC validator; tag normalization reused from F4.
- **Security** — player response has no `isRevealed`; descriptions with `<script>` render as text.
- **Accessibility** — axe on list/detail/form; switch operable with Space.
- **Manual exploratory** — 5000-char description on a phone; 10 tags wrapping.

## 17. Documentation & Training

- `docs/api.md`: NPC routes and `NPC_LIMIT`.
- Help text under the switch: "Players can see this NPC."

## 18. Open Questions

1. Is `role` free text or a fixed list (ally / enemy / neutral)? Free text for MVP. Owner: frontend pair.
2. Should the GM be able to write private GM-only notes on a revealed NPC? Post-MVP. Owner: team.

## 19. References

- Group 3 whiteboard — NPCs model.
- GM Vault spec — Character model (`kind: npc`, `isRevealed`), Characters endpoints.
- Related plans: F4, F5, F8, F10.
