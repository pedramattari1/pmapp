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

<!-- Append new lessons below as: pattern → preventing rule -->
