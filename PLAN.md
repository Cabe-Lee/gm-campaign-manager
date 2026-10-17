# GM Vault — Bakeoff 1 Plan (Next.js + Supabase)

> Source: `Feature Plans/README.md`, `F1-project-foundation.md`, `F2-auth-basics.md`, `F4-campaign-crud.md`.
> Goal: a working **prototype** in 2 weeks, not a finished product.

## 1. Scope

| In the prototype | Plan | Covers assignment requirement |
|---|---|---|
| App shell, error states, responsive layout, health check | F1 | Responsive UI, error handling |
| Sign up, log in, log out, protected pages | F2 | User authentication |
| Campaign dashboard + create / view / edit / delete | F4 (**MANUAL**) | Main feature |
| NPC CRUD | F6 | Stretch goal, only if time allows |

**Out of scope for the bakeoff:** F3, F5, F7, F8, F9, F10. They all depend on F4, and the assignment only asks for an MVP.

## 2. Stack

- **Next.js** (App Router): pages, server code, forms
- **Supabase**: Postgres database + Supabase Auth
- **Vercel**: hosting (free Hobby plan; fine for a class project)

## 3. How our plans translate to this stack

Our feature plans were written stack-neutral. This is what each idea becomes:

| Plan says | In Next.js + Supabase |
|---|---|
| `passwordHash`, bcrypt, sessions, httpOnly cookie (F2 FR-3, FR-6) | **Supabase Auth** does all of it. We never touch passwords. |
| `requireAuth` middleware (F2 FR-9) | `proxy.js` (called `middleware.js` in older Next.js) refreshes the session; pages call `supabase.auth.getUser()` and `redirect('/login')` when there's no user |
| User table (F2 §8) | `profiles` table linked to Supabase's built-in `auth.users` |
| "Only the GM can see/change it" + 404 for others (F4 FR-4, FR-5) | **Row Level Security (RLS)** policies in Postgres. Other users' rows are simply invisible, so the page shows "not found." |
| Cascade delete (F4 FR-6) | `on delete cascade` foreign keys |
| REST routes under `/api` (F1, F4 §9) | Pages read data in **Server Components**; forms save with **Server Actions**. Only `/api/health` is a real API route. |
| Error envelope `{ error: { code, message, fields } }` (F1 FR-4) | Server Actions return `{ message, fields }`, and the form shows it |
| Login rate limit (F2 FR-11) | Supabase Auth's built-in rate limits (good enough for a prototype) |

> Write this table's differences down for the evaluation form: they're a real point of comparison with our Express design.

## 4. Project setup

Build the Next.js app in its own folder so it doesn't collide with the existing Express/Vite files:

```bash
git checkout main
git pull
git checkout -b bakeoff-1
npx create-next-app@latest web      # accept the defaults (App Router: Yes)
cd web
npm install @supabase/supabase-js @supabase/ssr
```

Create `web/.env.local` (never commit it):

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

In the Supabase dashboard: **Authentication → Sign In / Providers → Email → turn off "Confirm email"** for the prototype, so sign-up logs the user in right away (F2 FR-4).

### Folder layout

```
web/
  app/
    layout.js               ← app shell: header + main + footer (F1)
    page.js                 ← home: "Sign in to see your campaigns"
    not-found.js            ← "We couldn't find that page." (F1 AC-7)
    login/page.js           ← F2
    signup/page.js          ← F2
    campaigns/
      page.js               ← dashboard (F4)
      new/page.js           ← create form (F4)
      [id]/page.js          ← campaign overview (F4)
      [id]/edit/page.js     ← edit + delete (F4)
      actions.js            ← Server Actions for campaigns (F4)
    api/health/route.js     ← GET /api/health (F1)
  components/               ← Header, Footer, ErrorMessage, EmptyState, CampaignCard
  lib/supabase/
    server.js               ← Supabase client for server code
    client.js               ← Supabase client for the browser
  proxy.js                  ← refreshes the login session on every request
```

## 5. Database (run in Supabase → SQL Editor)

```sql
-- PROFILES: one row per user (F2 §8). Supabase stores email + password in auth.users.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  profile_picture text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Read own profile"   on public.profiles for select using (auth.uid() = id);
create policy "Update own profile" on public.profiles for update using (auth.uid() = id);

-- Automatically create a profile when someone signs up.
-- The name comes from the sign-up form (passed as options.data.name).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', 'New user'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- CAMPAIGNS (F4 §8)
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  description text not null default '' check (char_length(description) <= 2000),
  tags text[] not null default '{}' check (cardinality(tags) <= 10),
  gm_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index campaigns_gm_id_idx on public.campaigns (gm_id);

alter table public.campaigns enable row level security;
create policy "GM reads own campaigns"   on public.campaigns for select using (auth.uid() = gm_id);
create policy "GM creates campaigns"     on public.campaigns for insert with check (auth.uid() = gm_id);
create policy "GM updates own campaigns" on public.campaigns for update
  using (auth.uid() = gm_id) with check (auth.uid() = gm_id);   -- blocks changing gm_id (F4 AC-6)
create policy "GM deletes own campaigns" on public.campaigns for delete using (auth.uid() = gm_id);
```

## 6. Feature plans

### F1 — Foundation (AI-assisted, ~2 days)

- [ ] `layout.js` shell: header (search icon placeholder, "Campaigns" link, Login / name + Log out), `<main>`, footer "Group 3 © 2026"
- [ ] "Skip to main content" link; `header`/`nav`/`main`/`footer` landmarks
- [ ] Shared components: `ErrorMessage` (`role="alert"` + Try again), `EmptyState`, loading state (`loading.js` files)
- [ ] `not-found.js` with a link to Campaigns
- [ ] `app/api/health/route.js`: queries Supabase; `200 { status: "ok", db: "up" }` or `503 { status: "degraded", db: "down" }`
- [ ] Check at 360 px wide: no horizontal scrollbar (F1 AC-6)

### F2 — Auth (AI-assisted, ~2–3 days)

Follow Supabase's official guide: **"Setting up Server-Side Auth for Next.js"** (supabase.com/docs/guides/auth/server-side/nextjs).

- [ ] `lib/supabase/server.js` and `client.js` from the guide
- [ ] `proxy.js` from the guide (keeps sessions fresh, F2 AC-10)
- [ ] `/signup`: name, email, password (8+ chars) → `supabase.auth.signUp({ email, password, options: { data: { name } } })` → redirect to `/campaigns`
- [ ] `/login`: email, password → `signInWithPassword` → redirect to `next` or `/campaigns`
  - Wrong email **or** password shows the same message: "Email or password is incorrect." (F2 AC-5)
  - Only accept `next` values that start with `/` and not `//` (no open redirect)
- [ ] Log out button → `supabase.auth.signOut()` → redirect to `/`
- [ ] Header reads the profile name when signed in (F2 FR-13)
- [ ] Signed-out visit to `/campaigns` → `/login?next=/campaigns` (F2 AC-8)
- [ ] Field errors under inputs; button shows "Signing in…" while waiting

### F4 — Campaign CRUD (**MANUAL**: build it yourself, ~5 days)

AI's role here is **teacher, not author**: ask it to explain concepts and review your code, not to write the feature. Use the "Framework Student" agent.

**Concepts to learn first** (read these in the Next.js docs):

1. **Server Components**: a page can be an `async` function that loads data before rendering.
2. **Dynamic routes**: a folder named `[id]` matches `/campaigns/anything`. In current Next.js, `params` is a Promise: you `await` it to get `id`.
3. **Server Actions**: a function marked `'use server'` that a `<form action={...}>` calls directly. No fetch, no API route.
4. **`useActionState`**: lets a form show what the Server Action returned (your validation errors).
5. **`redirect()`, `notFound()`, `revalidatePath()`**: send the user elsewhere, show the 404 page, and refresh cached pages after data changes.

**Steps (try each one before asking AI):**

- [ ] **Dashboard `/campaigns`**: load the user's campaigns with the Supabase server client, newest first. Show title, first 140 characters of the description, tags and created date. *Hint:* `.from('campaigns').select(...).order(...)`. You don't need a `where gm_id = ...`; ask yourself why (answer: RLS).
- [ ] **Empty state**: no campaigns → "No campaigns yet" + "Create your first campaign" (F4 AC-8)
- [ ] **Create `/campaigns/new`**: form with title, description, tags (comma-separated). Write a `createCampaign` Server Action that:
  - trims the title and checks 1–100 chars
  - splits tags on commas, trims, lowercases, removes duplicates, max 10 (F4 FR-2, AC-1)
  - returns `{ fields: { title: "Required" } }` when invalid so the form can show it (F4 AC-2)
  - inserts the row, then redirects to `/campaigns/<new id>`
- [ ] **Overview `/campaigns/[id]`**: load one campaign; if Supabase returns nothing, call `notFound()` (F4 AC-4, AC-9). Add an Edit button and placeholder tabs (NPCs, Encounters, Notes, Chat, Players).
- [ ] **Edit `/campaigns/[id]/edit`**: same form, prefilled. `updateCampaign` action with the same validation; set `updated_at` to now (F4 AC-5).
- [ ] **Delete**: on the edit page; the button stays disabled until the user types the campaign title (F4 FR-9). `deleteCampaign` action → redirect to `/campaigns`.
- [ ] **Responsive grid**: 1 column < 600 px, 2 columns ≥ 600 px, 3 columns ≥ 1000 px

**Test it like the acceptance criteria:**

- [ ] AC-1: tags `" Horror, horror, 5e"` save as `horror`, `5e`
- [ ] AC-3: create a second account; its campaigns never show on yours
- [ ] AC-4: paste another user's campaign URL → "not found"
- [ ] AC-9: `/campaigns/not-a-real-id` → "not found," not a crash

### F6 — NPC CRUD (stretch)

Same pattern as F4 with an `npcs` table (`campaign_id` references `campaigns(id) on delete cascade`). Only start if F1, F2 and F4 are done and deployed.

## 7. Day-by-day checklist

| Day | Work |
|---|---|
| 1 | Branch, `create-next-app`, Supabase project, `.env.local`, run the SQL; app runs locally |
| 2 | F1 shell, footer, not-found page, `/api/health` |
| 3 | F2 Supabase clients + `proxy.js`; sign-up page |
| 4 | F2 login, logout, header name, `?next=` redirect |
| 5 | F2 error messages; first deploy to Vercel (add env vars there) |
| 6 | F4 learn: Server Components + dashboard list + empty state |
| 7 | F4 create form + Server Action + validation |
| 8 | F4 overview page + `notFound()` |
| 9 | F4 edit page |
| 10 | F4 delete with type-to-confirm |
| 11 | Responsive pass at 360 px, 768 px, 1440 px; test on your phone with the Vercel link |
| 12 | Error handling pass: every form and page has loading / empty / error states |
| 13 | Buffer, or F6 stretch |
| 14 | Final deploy, test every AC above, fill out the Bakeoff 1 Evaluation Form |

## 8. Prototype shortcuts (on purpose)

Skipped from the full plans to fit 2 weeks: pagination (F1 FR-8), 50-campaign limit (F4 FR-10), toasts, `docs/api.md`, automated tests (we test manually against the ACs), custom rate limiting.

## 9. Evaluation notes (fill in as you go)

- Setup time (create-next-app → first page running):
- Hardest concept to understand:
- What Supabase saved us compared with our Express plan:
- Where AI helped / where it got in the way:
- Would I pick this stack for the final project? Why?
