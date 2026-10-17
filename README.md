# GM Vault (gm-campaign-manager)

A campaign manager for tabletop game masters (GMs) and their players. GMs create campaigns and keep their NPCs, encounters and session notes in one place, and share what players are allowed to see.

**Group 3, WDD 430: Full Stack Development, Fall 2026**

| Team member | Role |
|---|---|
| Landon Stucki | Frontend |
| Cabe Lee | Backend |
| Tary-Denise Tupouata | Backend |
| Yuki Nishigaki | Team member |

## Project docs

- [`Feature Plans/README.md`](Feature%20Plans/README.md): feature inventory (F1–F10), build order, dependency map and data model decisions
- [`PLAN.md`](PLAN.md): Bakeoff 1 plan (Next.js + Supabase prototype of F1, F2 and F4)

## Branches

| Branch | What's on it |
|---|---|
| `main` | Specification, feature plans, Express + Vite starter and template pages |
| `bakeoff-1` | Bakeoff 1 prototype: Next.js + Supabase app in the `web/` folder |

## Running the project

### Express starter (repo root)

```bash
npm install
npm run dev      # starts server.js with nodemon
```

### Bakeoff 1 Next.js app (`web/`, on the `bakeoff-1` branch)

```bash
cd web
npm install
npm run dev      # http://localhost:3000
```

The app needs a `web/.env.local` file (never commit it):

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

## TODO before the final project

- [ ] **Remove `node_modules` from git.** It's currently committed to the repo (about 2,300 files). Before the final project:
  1. Add a `.gitignore` file at the repo root containing:
     ```
     node_modules/
     .env
     .env.local
     ```
  2. Remove the folder from git (this keeps it on your computer):
     ```bash
     git rm -r --cached node_modules
     git commit -m "Stop tracking node_modules"
     git push
     ```
  Anyone who clones the repo rebuilds it with `npm install`.
