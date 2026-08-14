# Phase 0 — Monorepo Scaffold + Auth

Goal (SETUP.md §5): deployable monorepo skeleton with auth working end to end.
No PM features. Everything wired to env vars; verified with real keys later.

## Tasks
- [x] Install pnpm (removed broken corepack shim; pnpm@9.15.9)
- [x] Workspace root: package.json, pnpm-workspace.yaml, tsconfig.base.json, .gitignore
- [x] apps/api — Express + TS + Prisma + @clerk/backend
  - [x] /health (public), /me (protected, returns id + role)
  - [x] Clerk token verification middleware (verifyToken + users.getUser for role)
  - [x] CORS restricted to WEB_ORIGIN
  - [x] Minimal Prisma schema (real data model deferred to Phase 1)
  - [x] .env.example
- [x] apps/web — Next.js App Router + Tailwind + shadcn/ui + Clerk
  - [x] ClerkProvider + clerkMiddleware protecting (app) group
  - [x] /sign-in, /sign-up
  - [x] (app)/today showing name + role (public metadata, default VIEWER)
  - [x] Typed API client (Bearer Clerk token) calling api /me
  - [x] .env.example
- [x] Root README (dev/build/deploy notes)
- [x] Verify: pnpm -r typecheck && lint && build clean; prisma validate; /health 200
- [x] git init + first commit (no push)

## Notes
- BUILD_PLAN.md is missing from the repo — needed before Phase 1.
- Prisma schema is a Phase-0 placeholder; real model comes in Phase 1.

## Review

**Status: Phase 0 DONE — live-verified 2026-08-14.** Signed in via Clerk, landed
on /today showing name (Pedram Attari) + role ADMIN, and GET /me round-trip
returned {id, role:"ADMIN"} through the Clerk-verified middleware. Definition of
Done met.

What was built:
- pnpm-workspace monorepo (`apps/web`, `apps/api`), shared strict TS base config.
- **api**: Express + TS. `GET /health` (public) and `GET /me` (protected).
  `requireAuth` verifies the Clerk token with `@clerk/backend` `verifyToken`, then
  reads the authoritative role from Clerk public metadata via `users.getUser`
  (default VIEWER). CORS locked to `WEB_ORIGIN`. Prisma wired to `DATABASE_URL`
  with a models-free placeholder schema.
- **web**: Next.js App Router + Tailwind + shadcn/ui (Button) + Clerk.
  `clerkMiddleware` protects everything except `/sign-in` and `/sign-up`.
  `(app)/today` shows the user's name + role and renders the live `GET /me`
  round-trip. Typed API client attaches the Clerk token as a Bearer header.
- Root README, `.env.example` for both apps, `.gitignore` (no real env committed).

Verification performed (no external accounts needed):
- `pnpm -r typecheck` — clean.
- `pnpm -r lint` — 0 errors.
- `pnpm -r build` — both apps build; web prerenders 5 routes.
- `prisma validate` — schema valid (needs `DATABASE_URL` present to run).
- api smoke: `/health` → 200 `{"ok":true}`; `/me` no token → 401; bad token → 401.

Decisions / deviations:
- `prisma generate` is NOT in the build yet (no models until Phase 1); re-added then.
- No `packages/types` yet (phase discipline).
- Did not push to a remote (left to the user).

Follow-ups before Phase 1:
- **BUILD_PLAN.md is missing** — need it (or the regenerated monorepo version).
- Provision Clerk + Railway, fill `.env` files, do the together-verification.

---

# Phase 1 — Data Model + Seed

Goal (BUILD_PLAN §4 + §6): Prisma schema for all 9 models + enums, migration,
and seed of 13 assets + 29 PM templates from pm-seed.json. No UI.

## Tasks
- [x] Prisma schema per §4 (User, Asset, PMTemplate, Task, ChecklistTick,
      Reading, WorkOrder, Attachment, AuditLog) + 4 enums; arrays+JSON on
      PMTemplate; weekday/dayOfMonth; indexes. Validated + formatted.
- [x] prisma singleton `apps/api/src/prisma.ts`
- [x] `apps/api/prisma/seed.ts` — upsert assets by name, templates by title,
      resolve asset links, idempotent, prints summary
- [x] Wiring: package.json `prisma.seed` config, `db:seed` script, re-added
      `prisma generate` to build
- [x] Repo gate: typecheck + lint + build clean (with generated client)
- [x] Dry-validate seed data: 13 assets, 29 templates (2/3/24), all asset
      refs resolve, no problems
- [x] Migrate + seed + verify against Railway Postgres (via public proxy)

## Notes
- value on Reading is String (holds numbers and codes like "System error codes").
- Task rows intentionally NOT seeded (generated in Phase 2).
- Local .env uses Railway's DATABASE_PUBLIC_URL (public proxy). The deployed api
  on Railway should use the internal postgres.railway.internal URL.

## Review — Phase 1 DONE (2026-08-14)
- Migration `20260814213600_init` applied cleanly to Railway Postgres.
- `db:seed` populated **13 assets + 29 templates (2 daily / 3 weekly / 24
  monthly)**; re-run is idempotent (no dupes).
- Spot-checked via DB query: asset links, weekday/dayOfMonth, checklist items,
  and requiredReadings all correct (Fire Pump → suction/discharge psi; Generator
  → run time/fuel/battery).
- Repo gate clean: `pnpm -r typecheck && lint && build`.
- Not yet committed — awaiting go-ahead. Migration + seed + schema are staged
  changes ready to commit.
