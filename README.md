# The Fay — Preventive Maintenance Platform

Internal CMMS replacing eMaint for one residential high-rise (The Fay, San Jose).
Monorepo (pnpm workspaces): a Next.js web app and an Express + Prisma API.

See [`CLAUDE.md`](CLAUDE.md) for how we work and [`SETUP.md`](SETUP.md) for the
finalized architecture, accounts checklist, and env templates.

## Structure

```
apps/
  web/   Next.js (App Router) + TS, Tailwind + shadcn/ui, Clerk  → Vercel
  api/   Express + TS + Prisma, @clerk/backend token verify      → Railway
```

- **DB:** Postgres on Railway • **Auth:** Clerk • **Uploads:** UploadThing •
  **Email:** Resend • **Scheduling:** none (task instances generated on read;
  optional `POST /internal/run-daily` for digests — later phases).

## Prerequisites

- Node 20+ and pnpm 9+ (`npm i -g pnpm`). Verify: `node -v`, `pnpm -v`.
- Accounts per [`SETUP.md`](SETUP.md) §3 (Railway, Vercel, Clerk, Resend, UploadThing).

## Local development

```bash
pnpm install

# Fill env files first (see below), then in two terminals:
pnpm dev:api      # http://localhost:8080
pnpm dev:web      # http://localhost:3000
```

### Environment

Copy the example files and fill them per [`SETUP.md`](SETUP.md) §4:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Real `.env` files are gitignored — never commit secrets.

For Phase 0 you need, at minimum:
- **web** (`apps/web/.env.local`): `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
  `CLERK_SECRET_KEY`, `NEXT_PUBLIC_API_URL` (`http://localhost:8080`).
- **api** (`apps/api/.env`): `CLERK_SECRET_KEY`, `WEB_ORIGIN`
  (`http://localhost:3000`), `PORT` (`8080`). `DATABASE_URL` is only needed once
  you run Prisma against a real database.

Set each Clerk user's role in **public metadata**: `{"role":"ADMIN"}` — one of
`ADMIN | MANAGER | ENGINEER | TECH | VIEWER` (default `VIEWER`).

## Quality gate (must pass before "done")

```bash
pnpm -r typecheck && pnpm -r lint && pnpm -r build
```

## Deploy

- **Vercel** → import the repo, **Root Directory = `apps/web`**, add the web env
  vars under Settings → Environment Variables.
- **Railway** → add a service from the repo, **Root Directory = `apps/api`**,
  add the api env vars; provision a Postgres service and copy its `DATABASE_URL`.
- Add both prod URLs to Clerk allowed origins/redirects, and set the web app's
  `NEXT_PUBLIC_API_URL` / the api's `WEB_ORIGIN` to the deployed URLs.

## Phase status

**Phase 0** — monorepo scaffold + auth end to end. Web signs in via Clerk; the api
verifies the Clerk token and exposes `GET /health` (public) and `GET /me`
(protected, returns id + role). No PM features yet.
