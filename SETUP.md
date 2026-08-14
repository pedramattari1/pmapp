# The Fay PM Platform — Setup & Roles

Companion to BUILD_PLAN.md. Reflects the finalized decisions:
**monorepo, standalone Railway backend, no cron.**

---

## 1. Architecture (finalized)

```
pmapp/                      one GitHub repo (github.com/pedramattari1/pmapp)
  apps/
    web/    Next.js + TS, Tailwind + shadcn/ui   → deploys to Vercel
    api/    Express + Prisma                      → deploys to Railway
  packages/
    types/  shared TS types (optional)
  claude.md
  BUILD_PLAN.md
  SETUP.md
```

- **DB:** Postgres on Railway (same project as the api service).
- **Auth:** Clerk. Web signs the user in; api verifies the Clerk token on every request via `@clerk/backend`.
- **Uploads:** UploadThing on the web side; api just stores the returned URL.
- **Email:** Resend, called from api.
- **Scheduling:** none built in.
  - Task instances are created **on read** — first `/today` load of the day generates them (idempotent).
  - Overdue digests: api exposes `POST /internal/run-daily` behind `INTERNAL_RUN_SECRET`. You trigger it however you like (Railway scheduler, GitHub Action, pinger, manual). Nothing to configure until you want it.

---

## 2. Who does what

| Claude Code does | You do |
|---|---|
| Scaffold the monorepo (pnpm workspaces), both apps | Create the accounts & services in §3 |
| Prisma schema, migrations, seed | Provision Railway Postgres, copy `DATABASE_URL` |
| API routes, auth verification, on-read generation, `/internal/run-daily` | Paste keys into `.env` files and into Railway/Vercel dashboards |
| Web UI, Clerk sign-in, UploadThing, API client | Import repo to Vercel (root `apps/web`) and Railway (root `apps/api`) |
| Write `.env.example` for both apps + a README | Run the first migration against Railway (or hand Claude Code your local `DATABASE_URL` and let it) |
| `git init`, commit, push to your remote | Connect the GitHub repo for auto-deploy; set the external trigger for `/internal/run-daily` later |

> **Security:** put keys only in your `.env` files and the Railway/Vercel dashboards. Don't paste secret keys into this chat. Claude Code running on your machine reads them from your local `.env` — that's fine; sharing them here isn't needed.

---

## 3. Your setup checklist

Do these in order. Most take 2–5 min.

1. **Local tooling** — Node 20+, pnpm (`npm i -g pnpm`), git, and (optional) the GitHub CLI `gh`. Verify: `node -v`, `pnpm -v`, `git --version`.
2. **GitHub** — repo already created ✓. Nothing else until Claude Code pushes; then confirm the code lands.
3. **Railway**
   - New project → **Add Postgres**. Open it → **Variables** → copy `DATABASE_URL`.
   - Add a **service from your GitHub repo**, set **root directory = `apps/api`**, build/start per the README Claude Code writes.
   - Add the api env vars (§4) in the service's **Variables** tab.
4. **Vercel**
   - **Import** the same GitHub repo → set **Root Directory = `apps/web`**.
   - Add the web env vars (§4) under **Settings → Environment Variables**.
5. **Clerk**
   - Create an application → copy **Publishable key** + **Secret key**.
   - Add your Vercel URL (and `http://localhost:3000`) to allowed origins/redirects.
   - Roles: set a `role` on each user (Clerk **Public metadata**: `{"role":"ADMIN"}` etc. — values: ADMIN / MANAGER / ENGINEER / TECH / VIEWER).
6. **Resend** — create account → **API key**. For testing you can send from their onboarding domain; add your own domain later for real mail.
7. **UploadThing** — create an app → copy the **token**.
8. Fill the two `.env` files locally (§4) so you can run the app on your machine, and mirror the same values into Railway (api) and Vercel (web).

---

## 4. Env templates

**apps/web/.env.local**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8080     # Railway api URL in prod
UPLOADTHING_TOKEN=
```

**apps/api/.env**
```
DATABASE_URL=
CLERK_SECRET_KEY=
RESEND_API_KEY=
INTERNAL_RUN_SECRET=                           # you invent this; used to protect /internal/run-daily
WEB_ORIGIN=http://localhost:3000               # Vercel URL in prod, for CORS
PORT=8080
```

---

## 5. Revised Phase 0 prompt (monorepo scaffold)

Paste this into Claude Code first. It replaces Phase 0 in BUILD_PLAN.md.

> **Goal:** a deployable monorepo skeleton with auth working end to end. Read CLAUDE.md first, plan in tasks/todo.md, and check in before building.
>
> Set up a pnpm-workspace monorepo with `apps/web` and `apps/api`.
> - `apps/web`: Next.js (App Router) + TypeScript, Tailwind + shadcn/ui, Clerk sign-in/sign-up with a protected `(app)` route group (unauthed → sign-in). A `/today` page that shows the signed-in user's name and role (role read from Clerk public metadata, default VIEWER). A small typed API client that calls `NEXT_PUBLIC_API_URL` and attaches the Clerk token as a Bearer header.
> - `apps/api`: Express + TypeScript. Prisma configured against `DATABASE_URL`. CORS restricted to `WEB_ORIGIN`. Middleware that verifies the Clerk token with `@clerk/backend` and rejects unauthenticated requests. A `GET /health` route and a `GET /me` route that returns the authed user's id + role.
> - Write `.env.example` for both apps (values from SETUP.md §4), a root README with dev/build/deploy notes (Vercel root `apps/web`, Railway root `apps/api`), and `git init` + first commit. Do NOT commit any real `.env`.
>
> **Definition of Done:** `pnpm -r build` clean; running both apps locally, I can sign in on web, land on `/today` seeing my name + role, and the web app successfully calls the api's `/me` through the Clerk-verified middleware. No PM features yet — auth + the two services talking is the whole goal.

---

## 6. Changed vs BUILD_PLAN.md

These decisions supersede the original plan:
- **Split web/api monorepo** replaces the single Next.js app (§3 repo structure, and every phase prompt: data + API logic lives in `apps/api`, UI in `apps/web`).
- **No cron.** Phase 2's generation runs **on read**; the old cron endpoint becomes `POST /internal/run-daily` for optional email digests only.

The other phase prompts (1–5) still hold — they just need "backend route in apps/api / UI in apps/web" framing and the on-read swap. Say the word and I'll regenerate BUILD_PLAN.md as one clean, monorepo-correct version so you're not cross-referencing two docs.
