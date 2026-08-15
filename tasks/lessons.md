# Lessons

Patterns learned from corrections, so the same mistake isn't repeated.

## Environment
- **pnpm via corepack was broken** on this machine: `/opt/homebrew/bin/pnpm`
  symlinked to Node 23's corepack, which threw a signature-verification error
  ("Cannot find matching keyid"). Fix: remove the shim and
  `npm i -g pnpm@9`. Prevention: verify `pnpm -v` returns a real version before
  relying on it; don't trust a corepack shim.

## Working mode (2026-08-14)
- **Autonomous per-phase execution.** Don't stop for "want me to commit / proceed?"
  checkpoints on anything already in BUILD_PLAN.md. Plan → build → verify DoD →
  commit locally, then report only when the phase is done or genuinely blocked.
  Rule: pause briefly (with options) ONLY for the 5 exceptions — push/deploy,
  destructive DB ops on real data, needing the user's accounts/keys, genuine
  ambiguity not settled in BUILD_PLAN, or an exposed-secret/security concern.

## Prisma migrate in non-interactive shells
- `prisma migrate dev` prompts (and then errors "environment is non-interactive")
  when a new constraint could hit existing data. Fix: generate SQL with
  `prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel schema.prisma
  --script > migrations/<ts>_<name>/migration.sql`, then `prisma migrate deploy`.
  Prevention: don't rely on `migrate dev` in automation; use diff+deploy.

## tsx watch dies mid-install
- Adding a server dependency (e.g. pdfkit) while `pnpm dev:api` (tsx watch) is
  running: tsx hot-reloads on the source edit BEFORE install finishes, hits
  ERR_MODULE_NOT_FOUND, and the watcher **exits** (doesn't retry). Then the API is
  down and HTTP tests get ECONNREFUSED. Prevention: after adding a server dep,
  restart the api dev server; don't assume tsx watch recovered.

## Proving server-side RBAC (negative test)
- To prove role enforcement is server-side (not hidden UI), mint REAL low-priv
  Clerk tokens: clerkClient.users.createUser({publicMetadata:{role}}), then
  Backend API POST /v1/sessions {user_id} → POST /v1/sessions/{id}/tokens → jwt;
  verifyToken accepts it. Hit the protected endpoint over HTTP and assert 403 for
  VIEWER/TECH and 200 for ADMIN (positive control matters). Always clean up the
  test users (delete Clerk users + synced DB rows) — and if the run aborts early,
  sweep leftovers by email query (rbac-*@example.com).

## Service workers + Clerk (host_invalid)
- A service worker that caches/serves HTML **documents** breaks Clerk sign-in:
  Clerk's dev-mode embeds short-lived handshake state in the page, so a stale
  cached document → FAPI rejects with `host_invalid` ("Invalid host"). Also never
  precache a protected route (it caches the signed-out handshake response).
  Rule: SW must be **network-only for navigations** (documents), fallback to a
  static /offline page only on network failure; cache **only** immutable static
  assets (/_next/static, icons, fonts). Diagnose server-vs-client by curling the
  page from the server — if the server body has no `host_invalid`, it's the
  client (SW/cache), not the keys. Recovery for a stuck browser: DevTools →
  Application → Service Workers → Unregister + Clear site data, then reload.

## Don't pollute dev .next with placeholder NEXT_PUBLIC keys
- Running `pnpm -r build` with a DUMMY NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (e.g.
  the "example.clerk.accounts.dev" placeholder) bakes that key into apps/web/.next
  (middleware.js + prerendered HTML). A running `next dev` then serves the stale
  build and Clerk redirects to the wrong FAPI host → host_invalid. Prevention:
  don't export placeholder NEXT_PUBLIC_* when building in the same tree a dev
  server uses; if you must, `rm -rf apps/web/.next` and restart dev afterward.
  Verify with: curl the served page and grep the pk_test_ key / decode it.

<!-- Append new lessons below as: pattern → preventing rule -->
