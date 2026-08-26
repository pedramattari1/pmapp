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

---

# Phase 4 — Dashboard, Roles, Export

Goal (BUILD_PLAN §6 Phase 4): manager visibility + **server-side** role
enforcement + audit export. Roles: ADMIN/MANAGER see everything & edit templates
& change roles; ENGINEER/TECH complete their tasks; VIEWER read-only. DoD demands
enforcement is server-side (403), not hidden UI — proven with a negative test.

## Tasks
- [ ] API RBAC: `requireRole(...roles)` middleware (401 unauth, 403 wrong role),
      composed after requireAuth. Manager-only (ADMIN|MANAGER): GET /templates,
      POST /templates/:id (edit), GET /dashboard, GET /export/*. ADMIN-only:
      POST /users/:id/role (updates Clerk publicMetadata + DB).
- [ ] Export: CSV (built by hand) + PDF (pdfkit) of tasks + work orders over a
      date range; correct Content-Type + filename.
- [ ] NEGATIVE TEST (real Clerk tokens): VIEWER & TECH tokens hitting template
      edit / role change / export must return **403**; ADMIN gets 200. Feasibility
      probed OK — can mint low-priv session tokens + verifyToken accepts them.
- [ ] Web: /dashboard (completion rate, overdue, open WOs by status, recent
      activity), /admin (template edit + user role change), export buttons,
      role-gated nav (UI hint only — real gate is server-side).
- [ ] Verify: negative+positive RBAC pass; export files valid; repo gate; commit.

## Notes
- Role source of truth stays Clerk publicMetadata; role change writes there + DB.
- Dashboard gated to ADMIN|MANAGER (manager overview); others use /today.

## Review — Phase 4 (2026-08-14, DoD met)
- **Server-side RBAC proven with a real negative test** (minted Clerk tokens,
  real HTTP): VIEWER & TECH → 403 on template edit, role change, export;
  MANAGER → 403 on role change (admin-only); ADMIN → 200 on all; MANAGER → 200
  on template edit + export. Enforcement is `requireRole` middleware on
  req.user.role (from Clerk metadata), before handler logic — not hidden UI.
- Export verified: tasks.csv / work-orders.csv (correct headers + Content-Type +
  attachment filename), tasks.pdf (valid %PDF- magic, application/pdf).
- Dashboard returns completion rate / overdue / open WOs by status / recent
  activity. /admin edits templates + changes user roles (writes Clerk + DB).
- Nav links to Dashboard/Admin shown only to ADMIN|MANAGER (UI hint); the real
  gate is server-side (pages catch 403 → "Managers only").
- Repo gate clean; 6 web routes build.
- Ops note: tsx-watch api server dies if it hot-reloads mid-`pnpm install` of a
  new dep (pdfkit) — restart the api after adding server deps. Logged in lessons.

---

# Phase 5 — Field / Mobile Polish

Goal (BUILD_PLAN §6 Phase 5): mobile-first task completion; resilient to flaky
signal (offline queue that syncs when back online); installable PWA.
**Adjusted DoD:** mechanisms proven automatically (valid installable manifest +
SW; offline queue persists + flushes on reconnect; big tap targets); the physical
on-device install / low-signal run is the user's manual confirmation.

## Tasks
- [ ] PWA: app/manifest.ts (standalone, start_url /today, theme), PNG icons
      (192/512/maskable via sharp), public/sw.js (app-shell cache + fetch
      handler), ServiceWorkerRegistrar in layout, viewport/theme metadata
- [ ] Offline queue lib (injectable storage+fetcher, unit-testable): enqueue
      task saves on network failure, flush on 'online'/reload. Integrate into
      task-detail save (optimistic; "Saved offline — will sync" state)
- [ ] Mobile task flow: larger checkboxes/tap targets, one-thumb layout
- [ ] Verify: manifest fields valid; icons + sw present; queue unit test
      (enqueue → flush drains, failure re-queues); repo gate; commit
- [x] Verify: manifest fields valid; icons + sw served; queue unit test passes;
      repo gate clean; committed
- [ ] LATER (user, on device): install to home screen; complete a task in a
      low-signal spot without data loss

## Review — Phase 5 (2026-08-14, mechanisms verified)
- PWA installable: /manifest.webmanifest (200, application/manifest+json;
  standalone, start_url /today, theme #0f172a, 192/512 + maskable PNG icons
  generated via zlib — real PNGs), /sw.js (200) with a fetch handler
  (network-first navigations, cache-first assets, /offline fallback),
  registered by ServiceWorkerRegistrar in root layout. viewport/theme metadata +
  apple-web-app added. Physical install is the user's on-device step.
- Offline resilience: offline-queue.ts (injectable storage+saver, unit-tested in
  Node: persists while offline, drains on reconnect, idempotent). Task save now
  queues on network failure and shows "Saved offline — will sync"; the registrar
  flushes on the "online" event and on load (fresh Clerk token at flush time).
- Mobile: bigger checklist checkboxes (h-6), full-width Save on mobile, /offline
  page. Repo gate clean; 8 web routes build.

---

# Redesign + Performance (2026-08-14)

Hard constraint: **no changes to data model, API contracts, routes, or business
logic.** Every feature keeps working exactly as-is. Order (user-set): Part 2
diagnosis first (report) → Part 1 design system + Dashboard/Today (show) → rest.

## PART 2 — Performance (measure first, then fix)
- [ ] Instrument: request-timing middleware + Prisma query logging (temporary).
- [ ] Measure each endpoint with a real token: /me, /tasks/today, /tasks/:id,
      /work-orders, /admin/dashboard — wall time + query count. Look for:
      - requireAuth doing clerk.users.getUser (network) + user upsert EVERY request
      - generateTasksForToday running on every /today load
      - POST /tasks/:id per-item upserts (many round-trips in the txn)
      - N+1 in list/dashboard endpoints; missing indexes
      - frontend: force-dynamic refetch every nav; no optimistic UI/caching
- [ ] Report findings with real numbers (before).
- [ ] Fix real causes only (no contract change): cache auth/role from token claims,
      skip redundant work, optimistic UI on save, avoid full refetch. Re-measure.
- [x] Report before/after on slowest interactions. Commit.

### Part 2 findings + fixes (measured)
Root causes: (1) every authed request did clerk.users.getUser (~90ms) + a DB
user-upsert; (2) Prisma include fanned out to 1 query/relation (/tasks/:id=6,
/today=7); (3) ~100ms/query local latency = Railway PUBLIC proxy (prod internal
~1-5ms); (4) generateTasksForToday ran on every /today load.
Fixes (no contract/model/route/logic change): in-memory auth cache by clerkId
(30s TTL, invalidated on role change); generation memo (skip after first /today
of the day); relationJoins for detail reads (5 queries → 1). Before→after median:
/me 200→3, /tasks/today 920→203, /tasks/:id 695→104, /work-orders 299→107,
/dashboard 450→214. Frontend optimistic UI folded into the Part 1 component
rewrites. PERF_LOG-gated timing/query instrumentation left in place (dormant).

## PART 1 — Design system + redesign
- [ ] Tokens in globals.css/tailwind: accent, neutral gray scale, semantic status
      colors (6 states), radius, shadow scale, spacing. Light theme now; wire dark
      later (don't build).
- [ ] App shell for all authed routes: left sidebar (Today/Work Orders/Dashboard/
      Admin), product name top, user+role bottom; mobile → hamburger drawer; slim
      top bar (page title + primary actions). Content max-width.
- [ ] Redesign screens inside shell: Today, task detail, Work Orders, WO detail,
      Dashboard, Admin. Real cards (border/shadow/padding), type hierarchy.
- [ ] Status = colored badge everywhere; accent primary buttons, subdued secondary;
      hover/active/focus/disabled states.
- [ ] Loading (skeleton/spinner) + designed empty states on every screen.
- [ ] Responsive; PWA/offline intact. **CHECKPOINT: show Dashboard + Today first.**
- [x] Apply to remaining screens. Commit.

### Part 1 result
Design tokens in globals.css (indigo accent, slate neutrals, 6 semantic status
colors, radius/shadow/spacing; dark wired, not shipped). App shell (sidebar +
mobile drawer + user/role card) wraps all authed routes. Redesigned Today,
Dashboard (approved at checkpoint), task detail, Work Orders list + detail, Admin
— all in card-surface with PageHeader type hierarchy, soft status badges, refined
Button (accent primary / subdued secondary / focus+active+disabled), loading
skeletons (loading.tsx) + designed empty states everywhere. Responsive; PWA/
offline intact. No data/API/route/logic changes. Typecheck + lint + prod build
clean. Today + Dashboard verified with live screenshots; remaining screens are
compositions of the same verified primitives.

---

# Post-launch features (2026-08-26) — user requested all 7

Live app: web on Vercel, api+db on Railway. Ship each feature via git push
(auto-deploys). Order:
1. [in progress] Full template editor in Admin — edit frequency/weekday/dayOfMonth/
   checklist/readings/category/asset/active + CREATE new templates. (User blocker.)
2. [ ] Overdue & upcoming on Today + clickable Dashboard overdue count.
3. [ ] Task assignment UI (assigneeId already in model).
4. [ ] Standalone "+ New Work Order" (not tied to a task).
5. [ ] Real photo upload via UploadThing (build UI, wire to UPLOADTHING_TOKEN,
   ready like Resend). NOT Cloudflare — UploadThing fits one building.
6. [ ] Per-asset history view.
7. [ ] Email: code is already in place (Phase 3), just needs RESEND_API_KEY —
   leave off, keep build-ready.

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
