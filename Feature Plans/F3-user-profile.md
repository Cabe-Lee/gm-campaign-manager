# F3 — User Profile (view, edit name and picture, change password, delete account)

> Implementation plan. Source: GM Vault project spec (Sep 26, 2026), "MVP core features" §1 (Profile page) and "API endpoints → Auth and profile"; Group 3 whiteboard "Users" (`name (can change name)`, `profilePicture`).

## Metadata

| Field | Value |
|---|---|
| **Feature ID** | F3 |
| **Section** | Accounts |
| **Severity** | MINOR |
| **Markets** | N/A (course project) |
| **Status (today)** | MISSING |
| **Estimated effort** | S (1w), mostly frontend |
| **Owner (proposed)** | 1 frontend + backend support (names TBD) |
| **Depends on** | F2 |
| **Unblocks** | none (F5 and F9 display the name and picture but do not need the edit page) |

---

## 1. Problem Statement

After F2 a user has a name and email, but can't change their name, add a picture, change their password or leave the app. Players and GMs see each other's names and pictures in member lists (F5) and chat (F9), so users need a way to control how they appear. Users also need a way to delete their data.

## 2. Goals

- A logged-in user can view and edit their display name and profile picture.
- A logged-in user can change their password if they know the current one.
- A logged-in user can delete their account, with a clear rule for campaigns they run.

## 3. Non-Goals

- **Image file upload.** In MVP, `profilePicture` is an image URL the user pastes. File upload (spec `POST /uploads`) needs storage and is post-MVP.
- **Changing email.** Needs re-verification; post-MVP.
- **Bio** (spec field). Not on the team whiteboard; cut to keep the slice small.
- Viewing other users' profile pages.

## 4. Personas & User Stories

- **As a player**, I want to change my display name to my character's name so that my table recognizes me in chat.
- **As a GM**, I want a profile picture so that players see who runs the campaign.
- **As any user**, I want to change my password so that I can keep my account secure.
- **As a user leaving the app**, I want to delete my account so that my personal data is removed.

## 5. Functional Requirements

- **FR-1.** `GET /api/users/me` MUST return the public user (same shape as F2 `PublicUser`).
- **FR-2.** `PATCH /api/users/me` MUST accept `name` (1–60 chars, trimmed) and/or `profilePicture` (an `https://` URL ≤ 500 chars, or `null` to remove it). Unknown fields MUST be ignored. `email` and `passwordHash` MUST NOT be changeable here.
- **FR-3.** `PATCH /api/users/me` MUST return `200` with the updated public user, or `400 VALIDATION_ERROR` with `fields`.
- **FR-4.** `POST /api/users/me/password` SHOULD accept `{ currentPassword, newPassword }`; it returns `204` on success, `401 INVALID_CREDENTIALS` if `currentPassword` is wrong, `400` if `newPassword` fails the F2 rules.
- **FR-5.** After a password change, all *other* sessions of that user SHOULD be ended; the current one stays logged in.
- **FR-6.** `DELETE /api/users/me` MUST require `{ password }` in the body and return `401 INVALID_CREDENTIALS` if it's wrong.
- **FR-7.** `DELETE /api/users/me` MUST return `409 OWNS_CAMPAIGNS` with the list of campaign ids/titles if the user is the GM of any campaign. The user must delete those campaigns first (no automatic cascade of a GM's whole campaign).
- **FR-8.** On successful delete the API MUST: remove the user from every campaign's `playerIds` (F5), keep their chat messages but show the author as "Former member" (F9), end all sessions, delete the user row, and return `204`.
- **FR-9.** The frontend MUST show the profile picture wherever the user's avatar appears; if the URL fails to load it MUST fall back to the user's initials.
- **FR-10.** All `/api/users/me*` routes MUST use `requireAuth` (F2) and return `401` when signed out.

## 6. Non-Functional Requirements

- **Performance** — PATCH p95 < 300 ms.
- **Security** — password required for delete and password change; `profilePicture` only allows `https:` (blocks `javascript:` and `data:` URLs); rendered with `referrerpolicy="no-referrer"`.
- **Privacy & Compliance** — account deletion removes name, email and password hash. Chat messages stay for the campaign's history but lose the link to the person (see FR-8).
- **Accessibility** — avatar `<img>` has `alt="{name}'s profile picture"`; the delete dialog traps focus and is closable with Esc.
- **Scalability** — N/A.
- **Reliability** — deletion runs in a single transaction: either all of FR-8 happens or none of it.
- **Observability** — log account deletions (user id only) and password changes.
- **Maintainability** — reuse F2 validation rules for names and passwords; do not duplicate them.
- **Internationalization** — N/A for MVP.
- **Backward compatibility** — no schema changes beyond F2.

## 7. Acceptance Criteria

- **AC-1.** *Given* a logged-in user named "Ana", *When* they save the name "Ana the Bard", *Then* `PATCH /users/me` returns `200` with the new name and the header shows "Ana the Bard" without a page reload.
- **AC-2.** *Given* a logged-in user, *When* they save an empty name or a 61-character name, *Then* the API returns `400` with `fields.name` and the old name is unchanged.
- **AC-3.** *Given* a logged-in user, *When* they save `profilePicture = "javascript:alert(1)"` or an `http://` URL, *Then* the API returns `400` with `fields.profilePicture`.
- **AC-4.** *Given* a user whose `profilePicture` URL returns 404, *When* their avatar renders, *Then* their initials are shown instead of a broken image.
- **AC-5.** *Given* a logged-in user, *When* they submit a password change with the wrong current password, *Then* the API returns `401` and the old password still works.
- **AC-6.** *Given* a user who is GM of campaign "Curse of Strahd", *When* they try to delete their account, *Then* the API returns `409 OWNS_CAMPAIGNS` listing that campaign and the account still exists.
- **AC-7.** *Given* a user who is GM of no campaigns but is a player in one and has sent chat messages there, *When* they delete their account with the correct password, *Then* the API returns `204`, they're gone from that campaign's player list, their messages show "Former member", and logging in with their email returns `401`.
- **AC-8.** *Given* a signed-out visitor, *When* they call any `/api/users/me` route, *Then* the API returns `401 UNAUTHENTICATED`.

## 8. Data Model

- No new tables. Uses **User** from F2 (`name`, `profilePicture`, `passwordHash`).
- Deletion touches: `Campaign.playerIds` (F5), `ChatMessage.authorId` → set to `null` (F9; nullable FK).
- If F5/F9 haven't shipped yet, FR-8 steps for them are added when those features land (each feature's plan lists this).
- Migration: none. Backfill: none.

## 9. API Surface

| Verb | Path | Auth | Success | Errors |
|---|---|---|---|---|
| GET | `/api/users/me` | session | `200 PublicUser` | 401 |
| PATCH | `/api/users/me` | session | `200 PublicUser` | 400, 401 |
| POST | `/api/users/me/password` | session | `204` | 400, 401 |
| DELETE | `/api/users/me` | session | `204` | 401, 409 |

```ts
type UpdateMeBody = { name?: string; profilePicture?: string | null };
type ChangePasswordBody = { currentPassword: string; newPassword: string };
type DeleteMeBody = { password: string };
type OwnsCampaignsError = { error: { code: "OWNS_CAMPAIGNS"; message: string; campaigns: { id: string; title: string }[] } };
```

- Rate limit: password and delete routes share the F2 failed-password limiter.

## 10. UI / UX

- **New page:** `/profile` (linked from the user's name in the header).
- **Sections:** "Profile" (avatar preview, name, picture URL, Save), "Password" (current, new, Save), "Danger zone" (Delete account).
- **Flows:**
  1. Edit profile: change name/URL → live avatar preview → Save → toast "Profile saved".
  2. Change password: fill both fields → Save → toast "Password changed".
  3. Delete: "Delete account" → dialog asking for password → Confirm → on `204` redirect to `/` signed out; on `409` dialog lists the campaigns with links and says "Delete or hand off these campaigns first."
- **States:**
  - Loading: page shows `Loading` while `GET /users/me` runs; Save buttons show "Saving…" and are disabled.
  - Error: field errors under inputs; network failures show `ErrorMessage` with retry.
  - Empty: no picture → initials avatar with "Add a picture URL" hint.
- **Responsive:** sections stack in one column; avatar 64 px on phone, 96 px on desktop.
- **Accessibility:** toast uses `role="status"`; delete button is styled as destructive and labelled "Delete my account".

## 11. AI / ML Considerations

N/A — this feature has no AI or ML parts.

## 12. Integration Points

- External: none (images are hot-linked from the user's URL).
- Internal: F2 auth module and validators; F5 campaign membership; F9 chat authorship.

## 13. Dependencies & Sequencing

- Must ship after: F2.
- Must ship before: none. Can run in parallel with F4.
- FR-8 must be updated when F5 and F9 land (tracked in their plans).

## 14. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Hot-linked images break or track viewers | M | L | Initials fallback (FR-9); `no-referrer`; upload is a post-MVP item. |
| Deleting a user leaves orphaned membership/chat rows | M | M | Single transaction + AC-7 test; F5/F9 plans list their cleanup step. |
| Low priority, so it slips | M | L | Severity MINOR; can ship after F6 if the team falls behind. |

## 15. Rollout Plan

- Flag: none.
- Sequencing: PATCH route → profile page → password route → delete route (with the 409 rule) → cleanup hooks as F5/F9 land.
- Done: AC-1 to AC-8 pass.
- Rollback: revert merge; no schema change.

## 16. Test Plan

| AC | Test | Type |
|---|---|---|
| AC-1 | PATCH name → 200; header text updates | API + E2E |
| AC-2 | Empty / 61-char name → 400 `fields.name`; DB unchanged | API integration |
| AC-3 | `javascript:` and `http:` URLs → 400 `fields.profilePicture` | API integration |
| AC-4 | Set URL to 404 image; avatar shows initials | E2E |
| AC-5 | Wrong current password → 401; old password still logs in | API integration |
| AC-6 | User GMs a campaign → DELETE → 409 with that campaign | API integration |
| AC-7 | Player with chat messages deletes → 204; membership gone; messages author null; login 401 | API integration |
| AC-8 | Each route without cookie → 401 | API integration |

- **Security** — attempt to PATCH `email`/`passwordHash` → ignored; attempt to delete without password → 400/401.
- **Accessibility** — axe on `/profile`; keyboard through delete dialog.
- **Manual exploratory** — very long image URLs; huge images; 360 px layout.

## 17. Documentation & Training

- `docs/api.md`: four routes, `OWNS_CAMPAIGNS` error.
- In-app hint under the URL field: "Paste a link to an image (https only)."

## 18. Open Questions

1. Should a GM be able to transfer a campaign to a player instead of deleting it? Out of MVP; would replace the 409 rule. Owner: team.
2. Is a picture URL acceptable for grading, or does the instructor expect file upload? Owner: ask instructor.

## 19. References

- GM Vault spec — Profile page, `GET/PATCH/DELETE /users/me`.
- Group 3 whiteboard — Users fields.
- Related plans: F2, F5, F9.
