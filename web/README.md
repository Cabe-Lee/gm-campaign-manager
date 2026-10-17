# GM Vault: Bakeoff 1 Prototype

**Landon Stucki Bakeoff 2026.** A prototype of GM Vault built with a meta framework (server-side rendering).

## Stack

- **Next.js** (App Router): pages, Server Components, Server Actions, proxy
- **Supabase**: PostgreSQL database, Supabase Auth, Row Level Security
- **Vercel**: hosting

## Features (from the team feature plans)

| Plan | Feature | Status |
|---|---|---|
| F1 | App shell, responsive layout, error and loading states, `/api/health` | Done |
| F2 | Sign up, log in, log out, protected pages | Done |
| F4 | Campaign dashboard: create, view, edit, delete (type-to-confirm) | Done |

## Run locally

1. Copy `.env.local.example` to `.env.local` and fill in your Supabase URL and publishable key.
2. Run `supabase/schema.sql` once in the Supabase SQL Editor.
3. Start the app:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy (Vercel)

- Root Directory: `web`
- Framework Preset: Next.js
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
