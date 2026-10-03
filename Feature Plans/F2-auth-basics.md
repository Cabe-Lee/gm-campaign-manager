# F2 — Auth Basics (sign up, log in, log out, protected routes)

> Implementation plan. Source: GM Vault project spec (Sep 26, 2026), "MVP core features" §1 and "API endpoints → Auth and profile"; Group 3 whiteboard "Users (GMs & Players)".

## Metadata

| Field | Value |
|---|---|
| **Feature ID** | F2 |
| **Section** | Accounts |
| **Severity** | BLOCKER |
| **Markets** | N/A (course project) |
| **Status (today)** | MISSING |
| **Estimated effort** | S (1w) |
| **Owner (proposed)** | 1 backend + 1 frontend (names TBD) |
| **Depends on** | F1 |
| **Unblocks** | F3, F4 (and through them F5–F10) |

---

## 1. Problem Statement

Every campaign, NPC and note belongs to a person, and only that GM (or their invited players) should see it. Without accounts there is no way to tell users apart or protect their data. This feature lets a GM or player create an account, sign in, and sign out, and gives every later feature a trusted "current user".

## 2. Goals

- A visitor can create an account with name, email and password.
- A user can log in and stay logged in across page reloads until they log out or the session expires.
- Every non-public API route can rely on a `currentUser` and returns `401` without one.
- Frontend routes other than home, sign up and log in redirect to log in when signed out.

## 3. Non-Goals

- **Password reset by email.** In the spec, but it needs an email service. Moved to post-MVP (open question 1).
- **Site-wide roles (Admin).** In the spec, but GM/Player are per-campaign roles (F5), and there's no admin screen in MVP.
- Social login / OAuth, 2FA, email verification.
- Profile editing and account deletion (that's F3).

## 4. Personas & User Stories

- **As a new GM**, I want to sign up with my email so that I can start building campaigns.
- **As a player**, I want my own account so that my GM can add me to their campaign (F5).
- **As a returning user**, I want to stay logged in after a page refresh so that I don't retype my password at the table.
- **As a user on a shared computer**, I want to log out so that the next person can't see my campaigns.

## 5. Functional Requirements

- **FR-1.** `POST /api/auth/signup` MUST create a user from `name` (1–60 chars, trimmed), `email` (valid format, ≤ 254 chars) and `password` (8–72 chars).
- **FR-2.** Emails MUST be stored lowercased and trimmed, and MUST be unique; a duplicate returns `409 EMAIL_TAKEN`.
- **FR-3.** Passwords MUST be stored only as a salted adaptive hash (bcrypt or argon2). The plain password MUST NOT be stored or logged.
- **FR-4.** On successful sign up the user MUST be logged in immediately (session created) and get `201` with the public user object.
- **FR-5.** `POST /api/auth/login` MUST return `200` + public user for correct credentials and `401 INVALID_CREDENTIALS` for a wrong email **or** wrong password (same message for both).
- **FR-6.** The session MUST be carried in an `httpOnly`, `SameSite=Lax` cookie (`Secure` in production) and MUST expire after 7 days.
- **FR-7.** `POST /api/auth/logout` MUST end the session and clear the cookie; it returns `204` even if already logged out.
- **FR-8.** `GET /api/auth/me` MUST return `200` + public user when logged in, `401 UNAUTHENTICATED` when not.
- **FR-9.** A shared `requireAuth` middleware MUST return `401 UNAUTHENTICATED` on every protected route when no valid session exists.
- **FR-10.** API responses MUST never include `passwordHash`. The public user is `{ id, name, email, profilePicture, createdAt }`.
- **FR-11.** Login SHOULD be rate-limited: after 5 failed attempts for one email within 15 minutes, return `429 TOO_MANY_ATTEMPTS` until the window passes.
- **FR-12.** The frontend MUST redirect a signed-out user who opens a protected page to `/login?next=<path>`, and return them to `next` after login (only same-site relative paths).
- **FR-13.** The header MUST show "Login" when signed out and the user's name + "Log out" when signed in.

## 6. Non-Functional Requirements

- **Performance** — login/sign-up p95 < 500 ms (hashing included).
- **Security** — generic login error (no account enumeration on login); rate limit per FR-11; cookie flags per FR-6; CSRF covered by `SameSite=Lax` plus JSON-only bodies; `next` param must start with `/` and not `//` (no open redirect).
- **Privacy & Compliance** — store only name, email, password hash. No analytics on auth pages.
- **Accessibility** — form fields have `<label>`s; errors are tied to fields with `aria-describedby`; error summary uses `role="alert"`.
- **Scalability** — N/A (< 50 users).
- **Reliability** — signup is atomic: a failed insert leaves no half-created user or session.
- **Observability** — log signup/login success/failure with user id or email hash, never the password.
- **Maintainability** — auth code isolated in one module (`auth` routes + `requireAuth` middleware).
- **Internationalization** — N/A for MVP.
- **Backward compatibility** — N/A (first user table).

## 7. Acceptance Criteria

- **AC-1.** *Given* no account exists for `gm@example.com`, *When* a visitor submits name "Ana", that email and an 8+ char password, *Then* the API returns `201` with `{ id, name: "Ana", email: "gm@example.com" }`, sets a session cookie, and the header shows "Ana".
- **AC-2.** *Given* an account exists for `gm@example.com`, *When* a visitor signs up with `GM@Example.com `, *Then* the API returns `409 EMAIL_TAKEN` and no new user is created.
- **AC-3.** *Given* a sign-up with a 7-character password or a missing name, *When* submitted, *Then* the API returns `400 VALIDATION_ERROR` with the failing field(s) in `error.fields`, and the form shows the message next to that field.
- **AC-4.** *Given* a registered user, *When* they log in with the correct password, *Then* the API returns `200` + public user and the cookie is `httpOnly`.
- **AC-5.** *Given* a registered user, *When* they log in with a wrong password, *or* an unregistered email is used, *Then* both return `401 INVALID_CREDENTIALS` with the identical message.
- **AC-6.** *Given* 5 failed logins for one email in 15 minutes, *When* a 6th attempt is made (even with the right password), *Then* the API returns `429 TOO_MANY_ATTEMPTS`.
- **AC-7.** *Given* a logged-in user, *When* they click "Log out", *Then* `POST /api/auth/logout` returns `204`, and a following `GET /api/auth/me` returns `401`.
- **AC-8.** *Given* a signed-out visitor, *When* they open `/campaigns`, *Then* they are redirected to `/login?next=/campaigns`, and after logging in they land on `/campaigns`.
- **AC-9.** *Given* any user record, *When* it is returned by any auth endpoint, *Then* the JSON has no `passwordHash` or `password` field.
- **AC-10.** *Given* a logged-in user, *When* they reload the page, *Then* they stay logged in (header still shows their name).

## 8. Data Model

**User** (new)

| Field | Type | Rules |
|---|---|---|
| `id` | PK | |
| `name` | string | 1–60 chars, required (whiteboard "name (can change name)") |
| `email` | string | lowercased, unique index |
| `passwordHash` | string | never returned by the API |
| `profilePicture` | string \| null | URL; editing is F3 |
| `createdAt`, `updatedAt` | datetime | server-set |

**Session** (new, if the stack uses server-side sessions; skip if using signed tokens): `id`, `userId` FK → User, `expiresAt`.

**LoginAttempt** (or an in-memory store for MVP): `emailHash`, `count`, `windowStart`.

- Change from the whiteboard: `gmId[]` and `pcId[]` are **not** stored on User. A user's GM and player campaigns are found by querying Campaign (F4/F5). This avoids keeping two copies of membership in sync.
- Migration: `002_create_users` (+ `003_create_sessions` if used). Backfill: N/A.

## 9. API Surface

| Verb | Path | Auth | Success | Errors |
|---|---|---|---|---|
| POST | `/api/auth/signup` | none | `201 PublicUser` | 400, 409 |
| POST | `/api/auth/login` | none | `200 PublicUser` | 400, 401, 429 |
| POST | `/api/auth/logout` | none | `204` | — |
| GET | `/api/auth/me` | session | `200 PublicUser` | 401 |

```ts
type SignupBody = { name: string; email: string; password: string };
type LoginBody  = { email: string; password: string };
type PublicUser = { id: string; name: string; email: string; profilePicture: string | null; createdAt: string };
```

- Rate limit: login per FR-11. Sign up MAY share a simple per-IP limit (e.g. 20/hour).
- Document all four routes in `docs/api.md`.

## 10. UI / UX

- **New pages:** `/signup`, `/login`.
- **Modified:** `Header` (Login ↔ name + Log out); router guard for protected pages.
- **Flows:**
  1. Sign up: visitor clicks "Login" → "Create an account" link → fills name/email/password → submit → lands on `/campaigns`.
  2. Log in: `/login` → email/password → submit → redirect to `next` or `/campaigns`.
  3. Log out: header "Log out" → session cleared → redirect to `/`.
- **States:**
  - Loading: submit button disabled with "Signing in…" / "Creating account…".
  - Error: field errors under inputs; `401` shows "Email or password is incorrect."; `429` shows "Too many attempts. Try again in 15 minutes."; network error shows `ErrorMessage` with "Try again".
  - Empty: N/A (forms only).
  - Initial app load: `Loading` while `GET /auth/me` resolves, so protected pages don't flash.
- **Responsive:** form is full-width with 16 px gutters at 360 px, max-width 400 px on desktop.
- **Accessibility:** focus moves to the first invalid field on error; password field has a "Show password" toggle with `aria-pressed`.

## 11. AI / ML Considerations

N/A — this feature has no AI or ML parts.

## 12. Integration Points

- External: none (password hashing library only).
- Internal: F1 error/validation helpers and API client; exports `requireAuth` and `currentUser` used by F3–F10.

## 13. Dependencies & Sequencing

- Must ship after: F1.
- Must ship before: F3, F4.
- Shared infra: none new.

## 14. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cookie not sent because frontend and API run on different ports/origins | H | H | Use a dev proxy so both share one origin, or configure CORS `credentials: true` with an exact origin; test AC-10 on day 1. |
| Users stuck without password reset | M | M | Documented non-goal; for MVP demo, a teammate can reset via a seed script. |
| Rate limiter state lost on server restart | M | L | Acceptable for MVP; noted. |

## 15. Rollout Plan

- Flag: none; protected-route guard goes live with this feature.
- Sequencing: User migration → signup/login/logout/me routes → `requireAuth` → frontend pages → header + guard.
- Pilot: each teammate creates an account locally; seed script creates `gm@example.com` and `player@example.com` test users.
- Done: AC-1 to AC-10 pass.
- Rollback: revert merge; no other data depends on users yet.

## 16. Test Plan

| AC | Test | Type |
|---|---|---|
| AC-1 | POST signup valid → 201, cookie set, body has no hash | API integration |
| AC-2 | Signup with mixed-case duplicate email → 409, user count unchanged | API integration |
| AC-3 | Short password / missing name → 400 with `fields.password` / `fields.name`; form shows text | API + E2E |
| AC-4 | Login correct → 200; `Set-Cookie` contains `HttpOnly` | API integration |
| AC-5 | Wrong password and unknown email → both 401, identical `message` | API integration |
| AC-6 | 5 bad logins then good login → 429 | API integration |
| AC-7 | Logout → 204; `/auth/me` → 401 | API integration |
| AC-8 | Signed out → visit `/campaigns` → URL `/login?next=/campaigns` → log in → URL `/campaigns` | E2E |
| AC-9 | Snapshot of every auth response has no `password*` keys | API integration |
| AC-10 | Log in, reload, header still shows name | E2E |

- **Unit** — email normalization; `next` param validation (rejects `//evil.com`, `https://…`).
- **Security** — confirm DB stores hash only; check open redirect; check cookie flags.
- **Accessibility** — axe on `/login` and `/signup`; keyboard-only sign-up.
- **Manual exploratory** — sign up on a 360 px phone; paste email with spaces.

## 17. Documentation & Training

- `docs/api.md`: four auth routes, error codes `EMAIL_TAKEN`, `INVALID_CREDENTIALS`, `UNAUTHENTICATED`, `TOO_MANY_ATTEMPTS`.
- README: test accounts created by the seed script.

## 18. Open Questions

1. Do we add password reset after MVP, and with which email service? Owner: backend pair.
2. Server-side sessions or signed tokens in the cookie? Depends on the stack (F1 Q1). Either satisfies FR-6.
3. Is 7 days the right session length for a GM who plays weekly? Owner: team.

## 19. References

- GM Vault spec — "Auth and profile" endpoints, "Target audience and user roles".
- Group 3 whiteboard — Users model.
- OWASP Authentication Cheat Sheet; OWASP Session Management Cheat Sheet.
- Related plans: F1, F3, F5.
