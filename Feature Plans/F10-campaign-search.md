# F10 — Campaign Search and Tag Filter

> Implementation plan. Source: GM Vault project spec (Sep 26, 2026), "MVP core features" §7 (Search) and `GET /campaigns/:id/search`; Group 3 whiteboard wireframe (search icon in the header) and `tags` arrays on Campaigns and NPCs.

## Metadata

| Field | Value |
|---|---|
| **Feature ID** | F10 |
| **Section** | Search |
| **Severity** | MINOR |
| **Markets** | N/A (course project) |
| **Status (today)** | MISSING |
| **Estimated effort** | S (1w) |
| **Owner (proposed)** | 1 backend + 1 frontend (names TBD) |
| **Depends on** | F6, F7, F8 (and F4, F5) |
| **Unblocks** | none |

---

## 1. Problem Statement

At the table, a GM needs "that innkeeper whose name I forgot" in seconds, not by scrolling three tabs. The wireframe header already has a search icon, but nothing behind it. This feature searches NPCs, encounters and session notes inside one campaign, and filters the dashboard's campaign list by title or tag, while respecting what players are allowed to see.

## 2. Goals

- Inside a campaign, one search box finds NPCs, encounters and session notes by text, with optional type and tag filters.
- Players' results only include content they can already see (revealed NPCs and notes; never encounters).
- On the dashboard, the same search icon filters the user's campaigns by title or tag.

## 3. Non-Goals

- **Global search across all campaigns' contents.** One campaign at a time.
- Fuzzy matching / typo tolerance, ranking by relevance score, full-text search engines.
- Searching chat messages.
- Saved searches or search history.

## 4. Personas & User Stories

- **As a GM mid-session**, I want to type "inn" and see the innkeeper NPC and the note where we met her so that I can answer my players quickly.
- **As a GM**, I want to filter by tag "vallaki" to see everything in that town.
- **As a player**, I want to search the NPCs and recaps I've been shown.
- **As a GM with many campaigns**, I want to filter my dashboard by "horror" to find my horror games.

## 5. Functional Requirements

- **FR-1.** `GET /api/campaigns/:id/search?q=&type=&tag=` (member) MUST search with a case-insensitive substring match:
  - NPCs: `name`, `role`, `description`, `tags`
  - Encounters: `title`, `description`
  - Session notes: `title`, `content`
- **FR-2.** `q` MUST be 2–100 chars after trimming, unless `tag` is given (then `q` may be empty). Otherwise `400 VALIDATION_ERROR` with `fields.q`.
- **FR-3.** `type` MAY be `npc`, `encounter` or `note` to limit results; any other value → `400 fields.type`.
- **FR-4.** `tag` MAY filter to items with that tag (NPCs only, since encounters and notes have no tags).
- **FR-5.** Results MUST respect F5 rules: players get only revealed NPCs and revealed notes, and **no** encounters, even with `type=encounter` (returns an empty list, not 403, so the search box works the same for everyone).
- **FR-6.** The response MUST return at most 20 results per type, each as `{ type, id, title, snippet }`, where `snippet` is ≤ 160 chars around the first match, plus a `truncated` flag per type.
- **FR-7.** User input in `q` MUST be treated as literal text (regex/SQL wildcard characters like `.*%_` escaped).
- **FR-8.** The frontend MUST debounce typing by 300 ms and cancel the previous in-flight request when a new one starts.
- **FR-9.** On `/campaigns`, the header search MUST filter the already-loaded campaign list client-side by title or tag (no new endpoint). Inside a campaign, it opens the campaign search.
- **FR-10.** Matches in titles and snippets SHOULD be highlighted with `<mark>` (inserted safely, not via raw HTML).

## 6. Non-Functional Requirements

- **Performance** — p95 < 500 ms for a campaign with 500 NPCs, 100 encounters, 200 notes. A DB text index MAY be added if needed.
- **Security** — F5 `member` check; visibility filtered in the query (FR-5); FR-7 escaping prevents regex DoS / injection.
- **Privacy & Compliance** — no search terms logged with user ids.
- **Accessibility** — search is a `role="search"` landmark; results grouped under headings ("NPCs (3)"); result count announced via `aria-live="polite"`; Esc clears.
- **Scalability** — fine for MVP sizes; full-text index is the upgrade path.
- **Reliability** — a failure in one type's query fails the whole request (no partial silent results).
- **Observability** — log search latency and result counts (not the query text).
- **Maintainability** — each content type exposes a `searchX(campaign, role, q, tag)` function next to its model so new types plug in.
- **Internationalization** — case-insensitive match uses Unicode-aware lowercasing.
- **Backward compatibility** — read-only; no schema change except optional indexes.

## 7. Acceptance Criteria

- **AC-1.** *Given* NPC "Innkeeper Danika" and note "Session 2 — the Blue Water Inn", *When* GM Ana searches `inn`, *Then* both appear under "NPCs" and "Session notes" with the match highlighted.
- **AC-2.** *Given* NPC "Strahd" is hidden and encounter "Castle Ambush" mentions Strahd, *When* player Ben searches `strahd`, *Then* he gets zero results; *When* Ana searches `strahd`, *Then* she sees the NPC and the encounter.
- **AC-3.** *Given* Ben searches with `type=encounter&q=castle`, *When* the request runs, *Then* the API returns `200` with an empty encounter list.
- **AC-4.** *Given* `q = "a"` and no tag, *When* searched, *Then* the API returns `400` with `fields.q`.
- **AC-5.** *Given* `q = ".*"`, *When* searched, *Then* only items literally containing ".*" are returned (none in seed data), and no error occurs.
- **AC-6.** *Given* NPCs tagged `vallaki`, *When* Ana searches with `tag=vallaki` and empty `q`, *Then* only those NPCs are returned.
- **AC-7.** *Given* Ana types "danika" quickly, *When* she stops typing, *Then* only one request is sent after 300 ms (earlier ones cancelled or never sent).
- **AC-8.** *Given* Ana's dashboard with campaigns "Curse of Strahd" (tag horror) and "Lost Mine", *When* she types "horror" in the header search, *Then* only "Curse of Strahd" is shown.
- **AC-9.** *Given* a search with no matches, *When* results load, *Then* the page says "No results for “zzz”." and suggests checking spelling or removing the tag filter.
- **AC-10.** *Given* Cara is not a member, *When* she calls the search endpoint, *Then* it returns `404`.

## 8. Data Model

- No new tables.
- Optional indexes: text index or lowercase-name index on NPC (`campaignId`, `name`), Encounter (`campaignId`, `title`), SessionNote (`campaignId`, `title`). Add only if the AC performance target fails.
- Migration: `010_search_indexes` (optional).

## 9. API Surface

| Verb | Path | Auth | Success | Errors |
|---|---|---|---|---|
| GET | `/api/campaigns/:id/search?q=&type=&tag=` | member | `200 SearchResponse` | 400, 401, 404 |

```ts
type SearchResult = { type: "npc" | "encounter" | "note"; id: string; title: string; snippet: string };
type SearchResponse = {
  q: string;
  npcs:       { results: SearchResult[]; truncated: boolean };
  encounters: { results: SearchResult[]; truncated: boolean }; // always empty for players
  notes:      { results: SearchResult[]; truncated: boolean };
};
```

- Rate limit: MAY share a per-user limit of 60 searches/minute.
- Dashboard filter (FR-9) uses the existing `GET /api/campaigns` data; no new route.

## 10. UI / UX

- **Modified:** header search icon (from F1) now opens a search bar. On `/campaigns` it filters the dashboard; inside `/campaigns/:id/*` it opens `/campaigns/:id/search?q=`.
- **New:** `/campaigns/:id/search` results page with type chips (All / NPCs / Encounters [GM only] / Notes) and a tag chip row.
- **Flows:**
  1. GM taps search icon → types "inn" → results grouped by type → tap result → detail page; back button returns to results with the query kept in the URL.
  2. Dashboard: tap search icon → type "horror" → cards filter live.
- **States:**
  - Initial: "Search NPCs, encounters and notes" hint (players: "Search NPCs and notes").
  - Loading: small spinner in the search box; previous results stay visible but dimmed.
  - Empty: AC-9 copy.
  - Error: `400` → inline hint "Type at least 2 characters"; other errors → `ErrorMessage` with retry.
- **Responsive:** on phones the search bar expands to full header width with a Cancel button; results are a single column.
- **Accessibility:** results list uses headings per type; keyboard Up/Down MAY move through results; Esc closes the bar and returns focus to the icon.

## 11. AI / ML Considerations

N/A — plain text matching, no AI or ML.

## 12. Integration Points

- Internal: F5 helpers and `visibleTo`; F6, F7, F8 models; F1 header; F4 dashboard list.
- External: none.

## 13. Dependencies & Sequencing

- Must ship after: F6, F7, F8 (searches all three) and F5 (visibility rules).
- Must ship before: none. Last MVP feature.
- The NPC part can start once F6 is merged; add notes/encounters as they land.

## 14. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Search leaks hidden NPCs, notes or encounters to players | M | H | Reuse `visibleTo`; AC-2 and AC-3 in the shared authz test file. |
| Regex/wildcard injection or slow queries | M | M | FR-7 escaping; 100-char cap; per-type limit of 20. |
| Last in the order, so it gets squeezed | H | M | Severity MINOR; the dashboard filter (FR-9) is cheap and can ship alone if time runs out. |

## 15. Rollout Plan

- Flag: none.
- Sequencing: dashboard client filter → search endpoint (NPCs) → add notes → add encounters → results page → highlighting.
- Done: AC-1 to AC-10 pass.
- Rollback: revert; header icon goes back to inactive.

## 16. Test Plan

| AC | Test | Type |
|---|---|---|
| AC-1 | Seed NPC + note; GM `q=inn` → both groups | API integration + E2E |
| AC-2 | Hidden NPC + encounter; player 0 results; GM 2 | API integration (authz matrix) |
| AC-3 | Player `type=encounter` → 200 empty | API integration |
| AC-4 | `q=a` → 400 | API integration |
| AC-5 | `q=.*` → literal match, no error | API integration |
| AC-6 | `tag=vallaki`, empty q → tagged NPCs only | API integration |
| AC-7 | Fast typing → one request (network log) | E2E |
| AC-8 | Dashboard "horror" filter | E2E |
| AC-9 | No-match copy | E2E |
| AC-10 | Non-member → 404 | API integration |

- **Unit** — escape helper; snippet builder (match near start, middle, end; multi-byte characters).
- **Security** — authz rows for search; `q` with `<script>` highlighted safely.
- **Accessibility** — axe on results page; screen reader hears result counts.
- **Performance** — seed 500/100/200 rows, assert p95 < 500 ms over 50 runs.
- **Manual exploratory** — search on a 360 px phone with on-screen keyboard open.

## 17. Documentation & Training

- `docs/api.md`: search route and response shape.
- Help text: "Search looks in names, descriptions and note text."

## 18. Open Questions

1. Should encounters and notes get `tags` too, so the tag filter works across everything? Post-MVP. Owner: team.
2. Do we need search in chat? Not planned. Owner: team.

## 19. References

- GM Vault spec — Search feature, `GET /campaigns/:id/search`.
- Group 3 whiteboard — header search icon, `tags` fields.
- OWASP Input Validation Cheat Sheet (escaping user-supplied patterns).
- Related plans: F1, F4, F5, F6, F7, F8.
