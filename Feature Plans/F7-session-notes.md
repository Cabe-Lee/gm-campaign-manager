# F7 — Session Notes CRUD

> Implementation plan. Source: Group 3 whiteboard "Session Notes" model; GM Vault project spec (Sep 26, 2026), SessionNote model and "Notes" endpoints (spec "Additional features" #3, promoted to MVP by the team whiteboard).

## Metadata

| Field | Value |
|---|---|
| **Feature ID** | F7 |
| **Section** | Campaign content |
| **Severity** | MAJOR |
| **Markets** | N/A (course project) |
| **Status (today)** | MISSING |
| **Estimated effort** | S (1w) |
| **Owner (proposed)** | 1 backend + 1 frontend (names TBD) |
| **Depends on** | F5 |
| **Unblocks** | F10 |

---

## 1. Problem Statement

GMs lose track of what happened in past sessions, and players forget too. Notes end up spread across notebooks and phones. This feature gives each campaign a dated list of session notes the GM writes, and lets the GM share a recap with players while keeping prep notes private.

## 2. Goals

- The GM can create, view, edit and delete session notes with a title, session date and content.
- Notes list newest session first, so "what happened last time?" is one tap.
- The GM can share a note with players (revealed); players see only shared notes.

## 3. Non-Goals

- **Rich text / Markdown rendering.** Plain text with line breaks in MVP.
- **Linking notes to NPCs/items** (spec additional feature #3). Post-MVP.
- Player-written notes or comments.
- Version history.

## 4. Personas & User Stories

- **As a GM**, I want to write notes after each session with the date it happened so that I can prepare the next one.
- **As a GM**, I want to share a recap with players while keeping my prep notes private.
- **As a player**, I want to read the recap of last session before we play.

## 5. Functional Requirements

- **FR-1.** `POST /api/campaigns/:id/notes` (GM only) MUST create a note from `title` (1–120, required), `sessionDate` (ISO date `YYYY-MM-DD`, required, not more than 1 year in the future), `content` (0–20 000 chars) and `isRevealed` (default `false`).
- **FR-2.** `GET /api/campaigns/:id/notes` (member) MUST return notes filtered by F5 `visibleTo`, sorted by `sessionDate` descending then `createdAt` descending, paginated. List items MUST include a `preview` (first 200 chars of content) and MUST NOT include full `content`.
- **FR-3.** `GET /api/notes/:noteId` (member) MUST return the full note; players get `404` for unrevealed notes.
- **FR-4.** `PATCH /api/notes/:noteId` and `DELETE /api/notes/:noteId` MUST be GM-only (`403 GM_ONLY` for players, `404` for non-members).
- **FR-5.** Deleting the campaign (F4) MUST delete its notes.
- **FR-6.** The editor SHOULD warn before leaving the page with unsaved changes.
- **FR-7.** The editor MAY autosave a draft to the browser every 10 s (cleared on Save). The server is the only source of truth.

## 6. Non-Functional Requirements

- **Performance** — list p95 < 300 ms; full note ≤ 20 000 chars (~20 KB) per request.
- **Security** — F5 helpers on every route; content rendered as plain text (no HTML injection).
- **Privacy & Compliance** — prep notes never sent to players (filter in query).
- **Accessibility** — textarea has a visible label and a character counter announced politely (`aria-live="polite"`) only near the limit.
- **Scalability** — index `(campaignId, sessionDate)`.
- **Reliability** — PATCH is a full replace of the sent fields; last write wins (acceptable: only the GM edits).
- **Observability** — log create/delete with ids (never log content).
- **Maintainability** — reuse the F6 list/detail/form page pattern.
- **Internationalization** — `sessionDate` stored as a date (no time zone); displayed with browser locale.
- **Backward compatibility** — new table.

## 7. Acceptance Criteria

- **AC-1.** *Given* GM Ana's campaign, *When* she saves a note "Session 3 — The Bone Grinder", `sessionDate` `2026-09-28`, *Then* the API returns `201` with `isRevealed: false`.
- **AC-2.** *Given* the note form, *When* Ana submits with no title, or with `sessionDate` `2028-01-01` or `"next friday"`, *Then* the API returns `400` with `fields.title` or `fields.sessionDate`.
- **AC-3.** *Given* notes dated 2026-09-14, 2026-09-28 and 2026-09-21, *When* Ana lists notes, *Then* they come back in the order 09-28, 09-21, 09-14, each with a `preview` and no `content`.
- **AC-4.** *Given* one shared and one private note, *When* player Ben lists notes, *Then* he sees only the shared one, and `GET` on the private one returns `404`.
- **AC-5.** *Given* Ben is a player, *When* he tries to create, edit or delete a note, *Then* each returns `403 GM_ONLY`.
- **AC-6.** *Given* Ana has typed in the editor without saving, *When* she clicks a link to another page, *Then* the browser asks her to confirm leaving.
- **AC-7.** *Given* a campaign with no notes, *When* Ana opens the Notes tab, *Then* she sees "No session notes yet" and an "Add note" button; Ben sees "No shared notes yet."

## 8. Data Model

**SessionNote** (new)

| Field | Type | Rules |
|---|---|---|
| `id` | PK | |
| `campaignId` | FK → Campaign | required, indexed |
| `title` | string | 1–120 |
| `sessionDate` | date | required; whiteboard `date` interpreted as **the day the session was played**, not the creation time |
| `content` | text | 0–20 000 |
| `isRevealed` | boolean | default `false` (added, see F5 open question 1) |
| `createdAt`, `updatedAt` | datetime | |

- Migration: `007_create_session_notes`. Add to F4 cascade.

## 9. API Surface

| Verb | Path | Auth | Success | Errors |
|---|---|---|---|---|
| GET | `/api/campaigns/:id/notes?page=&limit=` | member | `200 Page<NoteSummary>` | 401, 404 |
| POST | `/api/campaigns/:id/notes` | GM | `201 Note` | 400, 401, 403, 404 |
| GET | `/api/notes/:noteId` | member (revealed for players) | `200 Note` | 401, 404 |
| PATCH | `/api/notes/:noteId` | GM | `200 Note` | 400, 401, 403, 404 |
| DELETE | `/api/notes/:noteId` | GM | `204` | 401, 403, 404 |

```ts
type NoteInput = { title: string; sessionDate: string /* YYYY-MM-DD */; content?: string; isRevealed?: boolean };
type Note = { id: string; campaignId: string; title: string; sessionDate: string; content: string;
              isRevealed?: boolean /* GM only */; createdAt: string; updatedAt: string };
type NoteSummary = Omit<Note, "content"> & { preview: string };
```

## 10. UI / UX

- **New:** "Notes" tab on `/campaigns/:id`, `/campaigns/:id/notes/new`, `/notes/:noteId`, `/notes/:noteId/edit`.
- **Flows:**
  1. Add: Notes tab → "Add note" → title, session date (defaults to today), content, "Share with players" switch → Save → detail.
  2. Read: list shows date, title, preview; tap → full note.
  3. Edit/Delete: detail → Edit / Delete (confirm).
- **States:**
  - Loading: list skeleton; Save button "Saving…".
  - Empty: AC-7 copy.
  - Error: 404 → "This note doesn't exist or isn't shared with you."; save failure keeps the text in the editor and shows `ErrorMessage` with retry (no lost typing).
- **Responsive:** editor textarea fills width and grows to 60 vh on phones; date input uses native date picker.
- **Accessibility:** date field labelled "Session date"; shared notes show the text "Shared" next to the title.

## 11. AI / ML Considerations

N/A — this feature has no AI or ML parts.

## 12. Integration Points

- Internal: F5 helpers; F4 cascade; F10 search reads title + content.
- External: none.

## 13. Dependencies & Sequencing

- Must ship after: F5.
- Must ship before: F10.
- Can run in parallel with F6 and F9.

## 14. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| GM loses a long note when the save fails | M | H | Keep text on failure (UI rule) + FR-6 warning + optional draft autosave (FR-7). |
| Time-zone bugs shift `sessionDate` by one day | M | M | Store as date-only string; unit test around midnight UTC. |
| Team expects Markdown | L | L | Documented non-goal. |

## 15. Rollout Plan

- Flag: none.
- Sequencing: migration → routes → list/detail → editor → unsaved-changes guard → optional draft autosave.
- Seed: 2 notes (1 shared, 1 private).
- Done: AC-1 to AC-7 pass.
- Rollback: revert; drop table.

## 16. Test Plan

| AC | Test | Type |
|---|---|---|
| AC-1 | GM POST → 201, `isRevealed: false` | API integration |
| AC-2 | Missing title / far-future / non-ISO date → 400 | API integration |
| AC-3 | Three dates out of order → sorted desc; no `content` in list | API integration |
| AC-4 | Player list = shared only; GET private → 404 | API integration |
| AC-5 | Player POST/PATCH/DELETE → 403 | API integration (authz matrix) |
| AC-6 | Type, click nav link → `beforeunload` / router guard fires | E2E |
| AC-7 | Empty states for GM vs player | E2E |

- **Unit** — date validator (format, future limit, time-zone safe); preview truncation.
- **Security** — `<img onerror>` in content renders as text.
- **Accessibility** — axe on editor; keyboard save.
- **Manual exploratory** — paste a 20 000-char note on a phone; save while offline.

## 17. Documentation & Training

- `docs/api.md`: note routes.
- Help text under the switch: "Players can read this note."

## 18. Open Questions

1. Is `sessionDate` the right reading of the whiteboard's `date`? (Alternative: just `createdAt`.) Owner: team.
2. Should players be able to add their own notes later? Post-MVP. Owner: team.

## 19. References

- Group 3 whiteboard — Session Notes model.
- GM Vault spec — SessionNote model, Notes endpoints.
- Related plans: F4, F5, F10.
