# F5 — Campaign Players and Role-Based Access

> Implementation plan. Source: GM Vault project spec (Sep 26, 2026), "MVP core features" §9 (Role-based access) and "Campaigns and members" endpoints; Group 3 whiteboard "User roles: GMs, Players" and Campaign `pcIds`.

## Metadata

| Field | Value |
|---|---|
| **Feature ID** | F5 |
| **Section** | Campaigns / Access control |
| **Severity** | BLOCKER |
| **Markets** | N/A (course project) |
| **Status (today)** | MISSING |
| **Estimated effort** | S (1w), mostly backend |
| **Owner (proposed)** | 1 backend (lead) + 1 frontend for the Players tab (names TBD) |
| **Depends on** | F4 |
| **Unblocks** | F6, F7, F8, F9, F10 |

---

## 1. Problem Statement

The whiteboard defines two roles, GM and Player, but after F4 only the GM can see a campaign. Players need to join a campaign and see what the GM chooses to show them, and must never see the GM's secrets. A user can be GM of one campaign and a player in another, so the role belongs to the campaign, not the account. This feature adds players to campaigns and builds the one access rule that every content feature (F6–F10) uses.

## 2. Goals

- The GM can add an existing user to a campaign by email and remove them.
- Players see campaigns they belong to on their dashboard, marked "Player".
- One shared access helper answers "what is this user's role in this campaign?" and "can they do X?", so F6–F10 don't each write their own checks.
- A shared "revealed" rule: players only see content the GM has marked revealed.

## 3. Non-Goals

- **Email invitations** to people without accounts, and accept/decline flow. Spec "Additional features" #2; post-MVP. In MVP the player must already have an account.
- **Live reveal** (instant updates on players' screens). Post-MVP; players see changes on next load.
- Player-owned characters (spec "PCs"). Not on the whiteboard.
- More than one GM per campaign; site Admin role.

## 4. Personas & User Stories

- **As a GM**, I want to add my friends to my campaign by their email so that they can follow along.
- **As a GM**, I want to remove a player who left the group so that they no longer see campaign content.
- **As a player**, I want my dashboard to show the campaigns I'm in so that I can find them without a link.
- **As a player**, I want to leave a campaign I'm no longer playing.
- **As a GM**, I want unrevealed NPCs and notes hidden from players so that I don't spoil the story.

## 5. Functional Requirements

- **FR-1.** Campaign MUST gain `playerIds` (array of user ids, default empty). The GM MUST NOT appear in `playerIds`.
- **FR-2.** A shared helper `getCampaignRole(campaign, user)` MUST return `"gm"`, `"player"` or `null`.
- **FR-3.** A shared helper `loadCampaignForUser(id, user, { require: "gm" | "member" })` MUST return `404 NOT_FOUND` when role is `null`, and `403 GM_ONLY` when `require: "gm"` and role is `"player"`.
- **FR-4.** A shared helper `visibleTo(role)` MUST return a query filter: GM → all rows; player → only rows with `isRevealed = true`. F6 and F7 MUST use it.
- **FR-5.** `POST /api/campaigns/:id/players` (GM only) MUST accept `{ email }`, look up the user (case-insensitive) and add them. Returns `201` with the member list.
  - unknown email → `404 USER_NOT_FOUND`
  - already a player → `409 ALREADY_MEMBER`
  - the GM's own email → `400 CANNOT_ADD_SELF`
- **FR-6.** `GET /api/campaigns/:id/players` (member) MUST return the GM and the players as `{ id, name, profilePicture, role }`. It MUST NOT return emails to players. The GM MAY see emails.
- **FR-7.** `DELETE /api/campaigns/:id/players/:userId` MUST let the GM remove any player, and a player remove **themselves** (leave). Others get `403 GM_ONLY`. Returns `204`.
- **FR-8.** `GET /api/campaigns` MUST include campaigns where the user is in `playerIds`, with `role: "player"`, in the same sorted list as F4.
- **FR-9.** `GET /api/campaigns/:id` MUST return the campaign to players too (title, description, tags, GM name). `PATCH`/`DELETE` stay GM-only and return `403 GM_ONLY` to players.
- **FR-10.** A campaign SHOULD allow at most 12 players; the 13th returns `409 PLAYER_LIMIT`.
- **FR-11.** When a user deletes their account (F3), they MUST be removed from every `playerIds`.

### Access matrix (applies to F5–F10)

| Action | GM | Player | Non-member |
|---|---|---|---|
| View campaign | ✅ | ✅ | 404 |
| Edit/delete campaign | ✅ | 403 | 404 |
| Add/remove players | ✅ | 403 (may remove self) | 404 |
| View NPCs / session notes | all | revealed only | 404 |
| Create/edit/delete NPCs, notes, encounters | ✅ | 403 | 404 |
| View encounters | ✅ | 403 (GM prep only) | 404 |
| Read/post chat | ✅ | ✅ | 404 |
| Search | all types | revealed NPCs + notes only | 404 |

## 6. Non-Functional Requirements

- **Performance** — role check adds < 20 ms; index on `playerIds` (or on a join table) so the dashboard query stays fast.
- **Security** — all checks server-side; hidden content never sent to players (not hidden by CSS). Non-members get 404 so they can't probe ids. Adding by email reveals only whether an account exists *to a GM*; acceptable for MVP (open question 2).
- **Privacy & Compliance** — players don't see each other's emails (FR-6).
- **Accessibility** — Players tab list uses a `<ul>`; remove buttons labelled "Remove {name}".
- **Scalability** — ≤ 12 players per campaign makes an array fine; a join table is also acceptable.
- **Reliability** — add/remove are idempotent at the DB level (no duplicate ids).
- **Observability** — log add/remove/leave with campaign id and user ids.
- **Maintainability** — the helpers in FR-2–FR-4 are the only place access is decided; code review rejects inline role checks.
- **Internationalization** — N/A for MVP.
- **Backward compatibility** — migration adds `playerIds` with default `[]` to existing campaigns.

## 7. Acceptance Criteria

- **AC-1.** *Given* GM Ana and a registered user Ben, *When* Ana adds `BEN@example.com` to her campaign, *Then* the API returns `201` and Ben is in the member list with role "player".
- **AC-2.** *Given* Ana's campaign, *When* she adds an email with no account, *Then* the API returns `404 USER_NOT_FOUND`; *When* she adds Ben again, *Then* `409 ALREADY_MEMBER`; *When* she adds herself, *Then* `400 CANNOT_ADD_SELF`.
- **AC-3.** *Given* Ben is a player in Ana's campaign, *When* Ben opens `/campaigns`, *Then* the campaign is listed with a "Player" badge.
- **AC-4.** *Given* Ben is a player, *When* he calls `PATCH` or `DELETE /api/campaigns/:id`, or `POST .../players`, *Then* each returns `403 GM_ONLY` and nothing changes.
- **AC-5.** *Given* Cara is not a member, *When* she calls `GET /api/campaigns/:id` or `GET .../players`, *Then* each returns `404 NOT_FOUND`.
- **AC-6.** *Given* the campaign has one revealed and one unrevealed NPC (F6), *When* Ben lists NPCs, *Then* he gets only the revealed one, and requesting the unrevealed one by id returns `404`.
- **AC-7.** *Given* Ben is a player, *When* he leaves the campaign, *Then* the API returns `204`, it disappears from his dashboard, and his next `GET` on it returns `404`.
- **AC-8.** *Given* Ben is a player, *When* he calls `GET .../players`, *Then* the response has no `email` fields.
- **AC-9.** *Given* a campaign with 12 players, *When* the GM adds a 13th, *Then* the API returns `409 PLAYER_LIMIT`.

## 8. Data Model

- **Campaign** (changed): add `playerIds: FK[] → User`, default `[]`, indexed. (Whiteboard `pcIds`, renamed.)
  - Alternative if the DB is relational: `CampaignMember { campaignId, userId, role }` join table with a unique `(campaignId, userId)` index. Either is fine; the helpers hide the choice.
- **NPC, SessionNote** (added in F6/F7): `isRevealed: boolean`, default `false`. **This field is not on the whiteboard**; it's added so players can't see spoilers (open question 1).
- Migration: `005_add_campaign_players`. Backfill: set `playerIds = []` on existing campaigns.

## 9. API Surface

| Verb | Path | Auth | Success | Errors |
|---|---|---|---|---|
| GET | `/api/campaigns/:id/players` | member | `200 Member[]` | 401, 404 |
| POST | `/api/campaigns/:id/players` | GM | `201 Member[]` | 400, 401, 403, 404, 409 |
| DELETE | `/api/campaigns/:id/players/:userId` | GM, or self | `204` | 401, 403, 404 |
| GET | `/api/campaigns` | session | now includes `role: "player"` rows | 401 |
| GET | `/api/campaigns/:id` | member (was GM) | `200 Campaign` | 401, 404 |

```ts
type AddPlayerBody = { email: string };
type Member = { id: string; name: string; profilePicture: string | null; role: "gm" | "player"; email?: string /* GM only */ };
```

## 10. UI / UX

- **New:** "Players" tab on `/campaigns/:id`; "Player" / "GM" badge on dashboard cards.
- **Modified:** campaign overview hides Edit/Delete for players; F6–F9 tabs hide create/edit buttons for players.
- **Flows:**
  1. GM adds player: Players tab → email field + "Add player" → player appears in list.
  2. GM removes player: "Remove" next to name → confirm → removed.
  3. Player leaves: Players tab → "Leave campaign" → confirm → redirect to dashboard.
- **States:**
  - Loading: list skeleton; Add button "Adding…".
  - Empty: "No players yet. Add your group by email." (GM); players never see empty (GM is always listed).
  - Error: `USER_NOT_FOUND` → "No account uses that email. Ask them to sign up first."; `ALREADY_MEMBER` → "They're already in this campaign."; `PLAYER_LIMIT` → "Campaigns can have up to 12 players."
  - 403 from any page → "Only the GM can do that."
- **Responsive:** member list is a single column with 44 px tap targets for Remove.
- **Accessibility:** after adding, focus returns to the email field and a `role="status"` message announces "Ben added".

## 11. AI / ML Considerations

N/A — this feature has no AI or ML parts.

## 12. Integration Points

- Internal: extends F4 `loadCampaignForUser`; used by F6, F7, F8, F9, F10; F3 account deletion calls the remove-from-all-campaigns step.
- External: none.

## 13. Dependencies & Sequencing

- Must ship after: F4.
- Must ship before: F6, F7, F8, F9, F10 (they all call these helpers).
- The `visibleTo` helper (FR-4) can be written and unit-tested before F6 exists.

## 14. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| A later feature skips the helper and leaks hidden content | M | H | One authz-matrix test file shared by F5–F10; each feature adds rows to it. |
| Team disagrees with adding `isRevealed` (not on whiteboard) | M | M | Raise at next team meeting (open question 1) before F6 starts. |
| Players expect live updates | M | L | Documented non-goal; a "Refresh" button on lists. |

## 15. Rollout Plan

- Flag: none.
- Sequencing: migration → helpers (FR-2–FR-4) with unit tests → player routes → dashboard change → Players tab.
- Seed: add `player@example.com` to one of the sample campaigns.
- Done: AC-1 to AC-9 pass.
- Rollback: revert; `playerIds` column can stay (unused).

## 16. Test Plan

| AC | Test | Type |
|---|---|---|
| AC-1 | GM adds by mixed-case email → 201, member listed | API integration |
| AC-2 | Unknown / duplicate / self → 404 / 409 / 400 | API integration |
| AC-3 | Player dashboard shows campaign with Player badge | E2E |
| AC-4 | Player PATCH/DELETE campaign, POST players → 403 each | API integration (authz matrix) |
| AC-5 | Non-member GET campaign / players → 404 | API integration |
| AC-6 | Player lists NPCs → only revealed; GET hidden id → 404 | API integration (runs once F6 exists; helper unit-tested now) |
| AC-7 | Player leaves → 204; dashboard no longer lists it; GET → 404 | API + E2E |
| AC-8 | Player's members response has no `email` keys | API integration |
| AC-9 | 13th player → 409 | API integration |

- **Unit** — `getCampaignRole`, `loadCampaignForUser`, `visibleTo` for GM / player / null.
- **Security** — full access matrix above as a table-driven test.
- **Accessibility** — axe on Players tab.
- **Manual exploratory** — log in as GM and player in two browsers side by side.

## 17. Documentation & Training

- `docs/api.md`: player routes, `GM_ONLY`, `USER_NOT_FOUND`, `ALREADY_MEMBER`, `CANNOT_ADD_SELF`, `PLAYER_LIMIT`; the access matrix.
- In-app helper text on Players tab: "Players must have a GM Vault account."

## 18. Open Questions

1. Team OK with adding `isRevealed` to NPCs and session notes (not on the whiteboard)? Without it, players see every NPC. Owner: whole team, before F6.
2. Is revealing "this email has an account" to GMs acceptable? Owner: team.
3. 12-player cap: right number? Owner: team.

## 19. References

- GM Vault spec — Role-based access, CampaignMember model, "Member" definition in API section.
- Group 3 whiteboard — "User roles: GMs, Players", Campaign `pcIds`, User `gmId`/`pcId`.
- OWASP Authorization Cheat Sheet (deny by default, server-side checks).
- Related plans: F3, F4, F6–F10.
