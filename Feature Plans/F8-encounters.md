# F8 — Encounters CRUD (group NPCs into an encounter)

> Implementation plan. Source: Group 3 whiteboard "Encounters" model; GM Vault project spec (Sep 26, 2026), "Additional features" #5 (Encounter builder), promoted to MVP in a smaller form by the team whiteboard.

## Metadata

| Field | Value |
|---|---|
| **Feature ID** | F8 |
| **Section** | Campaign content |
| **Severity** | MAJOR |
| **Markets** | N/A (course project) |
| **Status (today)** | MISSING |
| **Estimated effort** | S (1w) |
| **Owner (proposed)** | 1 backend + 1 frontend (names TBD) |
| **Depends on** | F6 (and F5) |
| **Unblocks** | F10 |

---

## 1. Problem Statement

A GM preps fights and social scenes ahead of time: who shows up, what happens, and in what order. Right now that prep is scattered, and at the table the GM has to hunt for each NPC separately. An encounter groups NPCs under one title and description, so the GM opens one page and has everyone they need. Encounters are GM prep, so players never see them in MVP.

## 2. Goals

- The GM can create, view, edit and delete encounters with a title, description and a list of NPCs from the same campaign.
- The encounter page shows each linked NPC's name and role, with a link to the NPC.
- Deleted NPCs disappear from encounters cleanly (no broken links).

## 3. Non-Goals

- **Initiative tracker, HP counters, dice roller** (spec "Session View"). Post-MVP.
- **Monsters from game APIs** (spec templates). Post-MVP.
- **Revealing encounters to players.** GM-only in MVP (F5 access matrix).
- Ordering NPCs inside an encounter or giving them per-encounter quantities (e.g. "3 × Goblin").

## 4. Personas & User Stories

- **As a GM**, I want to create "Castle Ambush" with Strahd and three of his servants so that I have everyone on one page during the fight.
- **As a GM**, I want to add or remove NPCs from an encounter as my plan changes.
- **As a GM**, I want encounters hidden from players so that I don't spoil surprises.

## 5. Functional Requirements

- **FR-1.** `POST /api/campaigns/:id/encounters` (GM only) MUST create an encounter from `title` (1–120, required), `description` (0–5000) and `npcIds` (0–20 unique ids).
- **FR-2.** Every id in `npcIds` MUST belong to an NPC in the **same** campaign; otherwise the API MUST return `400 INVALID_NPC` listing the bad ids, and save nothing.
- **FR-3.** Duplicate ids in `npcIds` MUST be removed before saving (order of first appearance kept).
- **FR-4.** `GET /api/campaigns/:id/encounters` (GM only) MUST return encounters sorted by `updatedAt` descending, paginated, each with `npcCount`.
- **FR-5.** `GET /api/encounters/:encounterId` (GM only) MUST return the encounter with `npcs: [{ id, name, role }]` expanded, in `npcIds` order.
- **FR-6.** `PATCH` and `DELETE /api/encounters/:encounterId` MUST be GM-only. PATCH with `npcIds` replaces the whole list (FR-2/FR-3 apply).
- **FR-7.** Players calling any encounter route MUST get `403 GM_ONLY`; non-members get `404`.
- **FR-8.** When an NPC is deleted (F6 FR-5), its id MUST be removed from every encounter in that campaign in the same transaction.
- **FR-9.** Deleting the campaign (F4) MUST delete its encounters.
- **FR-10.** The NPC picker in the form SHOULD let the GM search NPCs by name as they type (client-side filter of the campaign's NPCs).

## 6. Non-Functional Requirements

- **Performance** — detail p95 < 300 ms with 20 NPCs (one query for the NPCs, not one per NPC).
- **Security** — F5 helpers; FR-2 prevents linking another campaign's NPCs (cross-campaign data leak).
- **Privacy & Compliance** — N/A beyond campaign privacy.
- **Accessibility** — NPC picker is a labelled list of checkboxes (works without drag-and-drop).
- **Scalability** — ≤ 20 NPCs per encounter keeps the array small.
- **Reliability** — FR-8 is transactional with the NPC delete.
- **Observability** — log create/delete with ids.
- **Maintainability** — reuse F6/F7 page pattern.
- **Internationalization** — N/A for MVP.
- **Backward compatibility** — new table.

## 7. Acceptance Criteria

- **AC-1.** *Given* GM Ana's campaign has NPCs Strahd and Rahadin, *When* she creates "Castle Ambush" with both, *Then* the API returns `201` and `GET` on it returns `npcs` with both names in that order.
- **AC-2.** *Given* an NPC id from a **different** campaign, *When* Ana includes it in `npcIds`, *Then* the API returns `400 INVALID_NPC` naming that id and no encounter is saved.
- **AC-3.** *Given* `npcIds = [strahd, rahadin, strahd]`, *When* Ana saves, *Then* the stored list is `[strahd, rahadin]`.
- **AC-4.** *Given* "Castle Ambush" includes Strahd, *When* Ana deletes Strahd (F6), *Then* the encounter's `npcs` no longer include him and the page shows no broken link.
- **AC-5.** *Given* Ben is a player, *When* he calls list, detail, create, edit or delete on encounters, *Then* each returns `403 GM_ONLY`, and the Encounters tab is not shown to him.
- **AC-6.** *Given* the form, *When* Ana submits a blank title or 21 NPCs, *Then* the API returns `400` with `fields.title` or `fields.npcIds`.
- **AC-7.** *Given* the campaign has no NPCs yet, *When* Ana opens "New encounter", *Then* the picker shows "Add NPCs first" with a link to the NPCs tab, and she can still save an encounter with no NPCs.
- **AC-8.** *Given* no encounters exist, *When* Ana opens the Encounters tab, *Then* she sees "No encounters yet" and a "New encounter" button.

## 8. Data Model

**Encounter** (new)

| Field | Type | Rules |
|---|---|---|
| `id` | PK | |
| `campaignId` | FK → Campaign | required, indexed |
| `title` | string | 1–120 |
| `description` | string | 0–5000 |
| `npcIds` | FK[] → NPC | 0–20, unique, same campaign (whiteboard "npcIds (array of foreign NPC's IDs)") |
| `createdAt`, `updatedAt` | datetime | whiteboard `date` → `createdAt` |

- Relational alternative: `EncounterNpc { encounterId, npcId, position }` join table with `ON DELETE CASCADE` on `npcId`, which handles FR-8 automatically.
- Migration: `008_create_encounters`. Add to F4 cascade; add FR-8 step to F6 delete.

## 9. API Surface

| Verb | Path | Auth | Success | Errors |
|---|---|---|---|---|
| GET | `/api/campaigns/:id/encounters?page=&limit=` | GM | `200 Page<EncounterSummary>` | 401, 403, 404 |
| POST | `/api/campaigns/:id/encounters` | GM | `201 Encounter` | 400, 401, 403, 404 |
| GET | `/api/encounters/:encounterId` | GM | `200 Encounter` | 401, 403, 404 |
| PATCH | `/api/encounters/:encounterId` | GM | `200 Encounter` | 400, 401, 403, 404 |
| DELETE | `/api/encounters/:encounterId` | GM | `204` | 401, 403, 404 |

```ts
type EncounterInput = { title: string; description?: string; npcIds?: string[] };
type Encounter = { id: string; campaignId: string; title: string; description: string;
                   npcIds: string[]; npcs: { id: string; name: string; role: string }[];
                   createdAt: string; updatedAt: string };
type EncounterSummary = Pick<Encounter, "id" | "title" | "updatedAt"> & { npcCount: number };
type InvalidNpcError = { error: { code: "INVALID_NPC"; message: string; invalidIds: string[] } };
```

## 10. UI / UX

- **New:** "Encounters" tab (GM only) on `/campaigns/:id`, `/campaigns/:id/encounters/new`, `/encounters/:encounterId`, `/encounters/:encounterId/edit`.
- **Flows:**
  1. Create: Encounters tab → "New encounter" → title, description, NPC picker (search box + checkbox list) → Save → detail.
  2. Use at the table: detail shows title, description, and NPC cards (name, role) linking to each NPC.
  3. Edit/Delete: detail → Edit / Delete (confirm "Delete encounter? NPCs are not deleted.").
- **States:**
  - Loading: list skeleton; picker shows "Loading NPCs…".
  - Empty: AC-7 and AC-8 copy.
  - Error: `INVALID_NPC` → "Some NPCs no longer exist. Refresh and try again." (refresh the picker); other errors inline / `ErrorMessage`.
- **Responsive:** picker becomes a full-screen sheet on < 600 px; NPC cards one column on phones, two on desktop.
- **Accessibility:** picker checkboxes labelled with NPC name + role; selected count announced ("2 NPCs selected").

## 11. AI / ML Considerations

N/A — this feature has no AI or ML parts.

## 12. Integration Points

- Internal: F5 helpers (`require: "gm"` on every route); F6 NPC table and delete hook; F4 cascade; F10 search (GM only for encounters).
- External: none.

## 13. Dependencies & Sequencing

- Must ship after: F6 (needs NPCs to link).
- Must ship before: F10.
- Can overlap with F7/F9 once F6's API is merged.

## 14. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Stale `npcIds` after NPC delete (array model) | M | M | FR-8 in the same transaction, or use the join table with cascade; AC-4 test. |
| Cross-campaign NPC linking | L | H | FR-2 server check; AC-2 test. |
| Scope creep toward a full combat tracker | H | M | Non-goals list; Session View is a separate post-MVP feature. |

## 15. Rollout Plan

- Flag: none.
- Sequencing: migration → routes + FR-2 validation → F6 delete hook (FR-8) → list/detail → form with picker.
- Seed: one encounter with 2 seeded NPCs.
- Done: AC-1 to AC-8 pass.
- Rollback: revert; drop table; remove FR-8 hook.

## 16. Test Plan

| AC | Test | Type |
|---|---|---|
| AC-1 | POST with 2 NPCs → 201; GET returns names in order | API integration |
| AC-2 | Foreign NPC id → 400 `INVALID_NPC` with `invalidIds`; count unchanged | API integration |
| AC-3 | Duplicate ids → stored de-duplicated | API integration |
| AC-4 | Delete NPC → encounter `npcs` shrinks | API integration |
| AC-5 | Player hits all 5 routes → 403; tab hidden | API integration + E2E |
| AC-6 | Blank title / 21 ids → 400 fields | API integration |
| AC-7 | Campaign with 0 NPCs → picker empty state; save succeeds | E2E |
| AC-8 | No encounters → empty state | E2E |

- **Unit** — `npcIds` de-dup and validation helper.
- **Security** — authz matrix rows for encounters; cross-campaign id test.
- **Accessibility** — axe on form; keyboard-only selection.
- **Performance** — check detail uses one NPC query (log query count in test).
- **Manual exploratory** — picker on 360 px with 100 NPCs.

## 17. Documentation & Training

- `docs/api.md`: encounter routes, `INVALID_NPC`.

## 18. Open Questions

1. Should the whiteboard's `date` on encounters be a planned session date instead of `createdAt`? Owner: team.
2. Do we need quantities ("3 × Zombie") before the Session View? Owner: team, post-MVP.

## 19. References

- Group 3 whiteboard — Encounters model.
- GM Vault spec — "Encounter builder" (additional feature #5).
- Related plans: F4, F5, F6, F10.
