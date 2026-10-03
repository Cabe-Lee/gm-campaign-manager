# F9 — Campaign Chat (polling message board)

> Implementation plan. Source: Group 3 whiteboard "Chat" (partly cut off in the screenshot: "campaign: use that player's …"); GM Vault project spec (Sep 26, 2026), "Additional features" #2 (real-time updates, post-MVP).

## Metadata

| Field | Value |
|---|---|
| **Feature ID** | F9 |
| **Section** | Collaboration |
| **Severity** | MAJOR |
| **Markets** | N/A (course project) |
| **Status (today)** | MISSING |
| **Estimated effort** | S (1w) |
| **Owner (proposed)** | 1 backend + 1 frontend (names TBD) |
| **Depends on** | F5 |
| **Unblocks** | none |

---

## 1. Problem Statement

Between sessions, groups coordinate scheduling and in-character chatter in outside apps, so campaign talk gets mixed up with everything else. The whiteboard calls for a chat inside each campaign. This feature adds a simple message board per campaign where the GM and players post short messages, shown under each author's name and picture. In MVP it updates by polling every few seconds, not by real-time sockets.

## 2. Goals

- Any campaign member can read and post messages in that campaign's chat.
- Messages show the author's current display name and picture, plus the time sent.
- New messages appear within ~5 seconds without a page reload while the chat is open.
- Authors can delete their own messages; the GM can delete any message.

## 3. Non-Goals

- **WebSockets / real-time push.** Polling is enough for MVP; sockets are the spec's "Real-time updates" advanced feature, post-MVP.
- Editing messages, reactions, threads, @mentions, attachments, images.
- Direct messages between two users, or GM whispers.
- Unread counts and notifications.
- Dice-roll commands in chat.

## 4. Personas & User Stories

- **As a player**, I want to ask "Are we still on for Friday?" in the campaign so that the whole group sees it.
- **As a GM**, I want to post a reminder about next session.
- **As a GM**, I want to delete an inappropriate message so that the chat stays friendly.
- **As any member**, I want new messages to show up while I'm on the page so that the chat feels live.

## 5. Functional Requirements

- **FR-1.** `POST /api/campaigns/:id/messages` (member) MUST create a message from `body` (1–1000 chars after trimming) with `authorId` = current user. Returns `201` with the message.
- **FR-2.** `GET /api/campaigns/:id/messages` (member) MUST return the newest 50 messages in **ascending** time order (oldest of the 50 first), each with `author: { id, name, profilePicture } | null`.
- **FR-3.** The GET MUST accept `?after=<messageId>` to return only messages newer than that id (up to 100), and `?before=<messageId>` to load 50 older messages.
- **FR-4.** The chat page MUST poll `?after=<lastId>` every 5 s while the browser tab is visible, and MUST stop polling when hidden or when the user leaves the page.
- **FR-5.** `DELETE /api/messages/:messageId` MUST be allowed for the message author and the campaign GM; others get `403 FORBIDDEN`; non-members get `404`. Deleted messages MUST be removed for everyone on their next poll (GET returns `deletedIds` since the last poll).
- **FR-6.** Posting MUST be rate-limited to 10 messages per user per 10 seconds per campaign (`429 TOO_MANY_MESSAGES`).
- **FR-7.** When the author's account is deleted (F3), their messages MUST stay with `author: null`, displayed as "Former member".
- **FR-8.** When a player leaves or is removed (F5), their old messages MUST stay, and they MUST lose access to the chat (404).
- **FR-9.** Message bodies MUST be rendered as plain text; URLs MAY be auto-linked with `rel="noopener noreferrer"`.
- **FR-10.** Deleting the campaign (F4) MUST delete its messages.

## 6. Non-Functional Requirements

- **Performance** — poll response p95 < 200 ms when there are no new messages (index on `(campaignId, id)`); polling 6 users × every 5 s is ~1.2 req/s per campaign, fine for MVP.
- **Security** — F5 `member` check on every route; rate limit (FR-6); plain-text rendering (no XSS).
- **Privacy & Compliance** — emails never included in author objects.
- **Accessibility** — message list is `role="log"` with `aria-live="polite"` so screen readers announce new messages; Enter sends, Shift+Enter adds a line break.
- **Scalability** — polling is the known limit; see risk table.
- **Reliability** — client keeps the last id and resumes after a failed poll with backoff (5 s → 10 s → 30 s max).
- **Observability** — count messages posted and poll errors; never log message bodies.
- **Maintainability** — polling logic in one reusable hook/service so sockets can replace it later.
- **Internationalization** — timestamps shown in browser locale and time zone.
- **Backward compatibility** — new table.

## 7. Acceptance Criteria

- **AC-1.** *Given* player Ben in Ana's campaign, *When* he posts "Are we on for Friday?", *Then* the API returns `201` and the message shows with his name, picture and time.
- **AC-2.** *Given* Ana has the chat open, *When* Ben posts a message, *Then* it appears in Ana's chat within 6 seconds without reloading.
- **AC-3.** *Given* Cara is not a member, *When* she GETs or POSTs messages for that campaign, *Then* both return `404`.
- **AC-4.** *Given* a whitespace-only message or one of 1001 chars, *When* it is posted, *Then* the API returns `400` with `fields.body`.
- **AC-5.** *Given* Ben's message, *When* Ana (GM) deletes it, *Then* `204` is returned and it disappears from Ben's open chat on his next poll; *When* Ben tries to delete one of Ana's messages, *Then* `403`.
- **AC-6.** *Given* 60 messages exist, *When* the chat opens, *Then* the newest 50 load in time order, and "Load older" fetches the remaining 10.
- **AC-7.** *Given* Ben posts 11 messages in 10 seconds, *When* the 11th is sent, *Then* the API returns `429` and the composer shows "Slow down a little."
- **AC-8.** *Given* Ben deleted his account, *When* Ana views the chat, *Then* his messages show "Former member" with a generic avatar.
- **AC-9.** *Given* the chat page is in a background browser tab, *When* 30 seconds pass, *Then* no poll requests are sent until the tab is visible again.
- **AC-10.** *Given* a campaign with no messages, *When* a member opens Chat, *Then* they see "No messages yet. Say hi to your party!"

## 8. Data Model

**ChatMessage** (new)

| Field | Type | Rules |
|---|---|---|
| `id` | PK | sortable by time (auto-increment or time-ordered id) |
| `campaignId` | FK → Campaign | required; index `(campaignId, id)` |
| `authorId` | FK → User, nullable | set to `null` when the author's account is deleted |
| `body` | string | 1–1000 |
| `createdAt` | datetime | |
| `deletedAt` | datetime \| null | soft delete so pollers can learn about deletions; purge rows after 7 days |

- The whiteboard's "use that player's …" is read as "show the player's name/picture". Author name is **joined at read time**, not copied into the message, so name changes from F3 show everywhere.
- Migration: `009_create_chat_messages`. Add to F4 cascade; add FR-7 step to F3 delete.

## 9. API Surface

| Verb | Path | Auth | Success | Errors |
|---|---|---|---|---|
| GET | `/api/campaigns/:id/messages?after=&before=` | member | `200 MessagesResponse` | 401, 404 |
| POST | `/api/campaigns/:id/messages` | member | `201 Message` | 400, 401, 404, 429 |
| DELETE | `/api/messages/:messageId` | author or GM | `204` | 401, 403, 404 |

```ts
type PostMessageBody = { body: string };
type Message = { id: string; campaignId: string; body: string; createdAt: string;
                 author: { id: string; name: string; profilePicture: string | null } | null };
type MessagesResponse = { data: Message[]; deletedIds: string[]; hasOlder: boolean };
```

- Note: this endpoint uses cursor paging (`after`/`before`) instead of the F1 `page`/`limit` shape, because chat grows while you read it. Documented in `docs/api.md`.

## 10. UI / UX

- **New:** "Chat" tab on `/campaigns/:id` (all members).
- **Layout:** message list (avatar, name, time, body) + composer pinned to the bottom with a Send button.
- **Flows:**
  1. Open chat → load latest 50 → scroll to bottom → start polling.
  2. Send → message appears right away as "sending" (grey) → turns normal on `201`, or shows "Failed — Retry" on error.
  3. Delete own (or any, if GM) → "⋯" menu → Delete → confirm.
  4. Scroll to top → "Load older".
- **States:**
  - Loading: skeleton bubbles on first load.
  - Empty: AC-10 copy.
  - Error: initial load failure → `ErrorMessage` with retry; poll failures show a small "Reconnecting…" banner with backoff; `429` → "Slow down a little."
  - Offline: "You're offline. Messages will load when you're back." (composer disabled).
- **Responsive:** on phones the chat uses the full viewport height below the header; composer stays above the on-screen keyboard.
- **Accessibility:** `role="log"`; each message has an accessible name "Ben, 7:42 PM: Are we on for Friday?"; auto-scroll only if the user is already near the bottom (don't yank them while reading history).

## 11. AI / ML Considerations

N/A — this feature has no AI or ML parts.

## 12. Integration Points

- Internal: F5 helpers (`member` for read/post; GM or author for delete); F3 delete hook; F4 cascade; F1 error helpers.
- External: none.

## 13. Dependencies & Sequencing

- Must ship after: F5.
- Must ship before: none.
- Can run in parallel with F6 and F7.

## 14. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Graders/team expect real-time sockets | M | M | Document polling as a deliberate MVP choice; the polling hook is built to be swapped for sockets. |
| Polling floods the server if the interval bug fires repeatedly | M | M | Single interval per page, stop on hidden tab (AC-9), backoff on errors. |
| Missed deletions or duplicate messages between polls | M | M | Cursor by id + `deletedIds`; client de-dups by id; test AC-2 and AC-5 with two sessions. |
| Moderation abuse in a public context | L | L | Campaigns are private groups; GM can delete any message. |

## 15. Rollout Plan

- Flag: none.
- Sequencing: migration → GET/POST → DELETE + `deletedIds` → chat UI → polling hook → rate limit → account-delete hook.
- Seed: 5 messages between the seeded GM and player.
- Done: AC-1 to AC-10 pass.
- Rollback: revert; drop table.

## 16. Test Plan

| AC | Test | Type |
|---|---|---|
| AC-1 | Player POST → 201 with author | API integration |
| AC-2 | Two browser sessions; B posts; A sees it ≤ 6 s | E2E |
| AC-3 | Non-member GET/POST → 404 | API integration (authz matrix) |
| AC-4 | Whitespace / 1001 chars → 400 | API integration |
| AC-5 | GM deletes player msg → 204, appears in `deletedIds`; player deletes GM msg → 403 | API integration + E2E |
| AC-6 | Seed 60; first GET = 50 ascending + `hasOlder: true`; `before` → 10 | API integration |
| AC-7 | 11 posts in 10 s → 429 | API integration |
| AC-8 | Delete author account → `author: null`; UI "Former member" | API + E2E |
| AC-9 | Hide tab (visibilitychange) → no requests for 30 s | E2E (network log) |
| AC-10 | Empty campaign → empty copy | E2E |

- **Unit** — polling hook (start/stop/backoff); de-dup by id.
- **Security** — `<script>` body renders as text; author spoofing (sending `authorId` in body) ignored.
- **Accessibility** — screen-reader check that new messages are announced once.
- **Performance** — poll with no new messages under 200 ms.
- **Manual exploratory** — phone keyboard covering composer; flaky network.

## 17. Documentation & Training

- `docs/api.md`: message routes, cursor paging, `TOO_MANY_MESSAGES`.
- README: note that chat uses polling (5 s) in MVP.

## 18. Open Questions

1. The whiteboard text under "Chat" is cut off ("campaign: use that player's …"). Does it mean showing the player's name/picture, or their **character** name? Owner: whoever wrote it.
2. Is polling acceptable to the instructor, or should real-time be in MVP? Owner: ask instructor.
3. How long do we keep chat history? (Currently forever.) Owner: team.

## 19. References

- Group 3 whiteboard — Chat.
- GM Vault spec — "Player invites + live reveal" (real-time, additional feature #2).
- Related plans: F3, F4, F5.
