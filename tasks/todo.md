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

---

# Phase 2 — Core PM Loop + On-Read Generation

Goal (CLAUDE.md + user msg; NOT BUILD_PLAN's stale cron framing): on-read
idempotent task generation, GET /tasks/today, GET/POST /tasks/:id, web /today +
/tasks/[id]. No cron. No /internal/run-daily (Phase 3).

## Tasks
- [x] Schema: Task.dueDate @db.Date; unique (templateId,dueDate),
      (taskId,label), (taskId,type); migration phase2_task_generation applied
- [x] API: time.ts (LA-local today), generation.ts (idempotent), requireAuth
      user-sync into User table, tasks.ts router (today/detail/save + AuditLog)
- [x] Web: api client fns, /today grouped list, /tasks/[id] + task-detail client
      component, shadcn input/textarea/label/badge + status-badge
- [x] Verify: generation idempotent (created 2 then 0); save persists +
      idempotent (ticks/readings/attachments no-dupe); repo gate clean
- [ ] Browser E2E (user-driven, like Phase 0): sign in → /today → open task →
      checklist/status/attachment → Save → reload persists

## Review — Phase 2 (2026-08-14)
- On-read generation is idempotent (unique templateId+dueDate + skipDuplicates);
  proven: run1 created=2, run2 created=0. LA-local "today" (Aug 14 = Fri) → 2
  daily tasks, no weekly/monthly (correct).
- Save path proven at data layer against a Generator task: status/ticks/readings/
  attachment persist; re-save does not duplicate (audits +1 per save by design).
- Not committed yet. Note: today has daily-only tasks (no readings) — to see the
  readings UI live, either test on the 1st (monthly) / a Monday (weekly), or ask
  me to drop a temporary reading-bearing task dated today.

---

# Phase 3 — Work Orders + Notifications

Goal (BUILD_PLAN §6 Phase 3, reconciled to monorepo/on-read): deficiencies
become tracked work orders; notifications on assignment + overdue digest.
**Adjusted DoD (user):** work orders complete end to end; notification code in
place and cleanly **no-ops + logs when RESEND_API_KEY absent**; digest endpoint
testable via a local INTERNAL_RUN_SECRET. Live email delivery verified later.

## Tasks
- [x] Local INTERNAL_RUN_SECRET set in apps/api/.env (dev value)
- [ ] API — `email.ts` (Resend, no-op+log without key), `workorders.ts`
      (POST create, GET list?status, GET :id, POST :id update/status/assign/
      attach), `GET /users` for assignee picker, `digest.ts` +
      `POST /internal/run-daily` (secret-checked, not Clerk auth), AuditLog on
      every mutation, assignment email on assignee set/change
- [ ] Web — `/work-orders` list+filter, `/work-orders/[id]` detail (status incl
      CLOSED, reassign, due, attachments), task-detail "Create work order"
      prompt when status is a deficiency, nav link, api client fns
- [ ] Verify — WO create/flag-from-task/close/reassign; email path logs "skipped"
      w/o key; `POST /internal/run-daily` returns digest summary w/ correct
      counts (401 without secret); repo gate clean; commit locally
- [ ] LATER (needs key): confirm live assignment email + digest email delivery

## Notes
- No schema change: WorkOrder + Attachment.workOrderId already exist (Phase 1).
- Digest replaces the plan's "cron run" — triggered by POST /internal/run-daily.
- Deficiency statuses that prompt a WO: NEEDS_REPAIR | PARTS | VENDOR | FOLLOW_UP.

## Review — Phase 3 (2026-08-14, adjusted DoD met)
- Work orders end to end: create (optionally task-linked), list + status filter,
  detail with status transitions incl CLOSED, reassign, due date, attachments.
  Task detail prompts a linked WO when a deficiency status is selected.
- Notifications: email.ts sends via Resend, but **no-ops + logs when
  RESEND_API_KEY absent** (verified: assignment + digest both returned
  skipped:true and logged "would send…"). isEmailEnabled()=false confirmed.
- Digest: POST /internal/run-daily secret-checked (401 no/wrong secret, 200 with
  INTERNAL_RUN_SECRET) → correct counts (overdue 1, open WO 1 → 0 after close).
- Every mutation writes an AuditLog (verified 2 for a WO create+update).
- Repo gate clean (typecheck/lint/build); 4 web routes build.
- LATER (needs key): confirm live assignment + digest email delivery once the
  user adds RESEND_API_KEY.

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
