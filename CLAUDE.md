# CLAUDE.md — The Fay Preventive Maintenance Platform

## Project
Internal CMMS replacing eMaint for one residential high-rise (The Fay, San Jose).
Users: ops manager, building engineer, GM, admin, maintenance techs. Internal only.
See BUILD_PLAN.md for the full spec, data model, and phase-by-phase goals.

**Monorepo** (pnpm workspaces), one GitHub repo:
- `apps/web` — Next.js (App Router) + TypeScript, Tailwind + shadcn/ui → Vercel
- `apps/api` — Express + TypeScript + Prisma → Railway
- Postgres on Railway. Clerk auth. Resend email. UploadThing for photos.
- **No cron.** Task instances are generated on read; an optional
  `POST /internal/run-daily` (secret-protected) exists only for email digests.

Commands:
- `pnpm install`
- `pnpm --filter web dev` / `pnpm --filter api dev`
- `pnpm --filter api prisma migrate dev` / `pnpm --filter api prisma db seed`
- `pnpm -r typecheck && pnpm -r lint && pnpm -r build` — must pass before "done"

## Phase discipline
- Build ONLY the current phase (BUILD_PLAN.md §9). Do not scaffold or stub future phases.
- Each phase has a Definition of Done. Prove it before moving on.
- If scope is unclear, STOP and ask — don't invent features.

## Workflow
1. Plan first: enter plan mode for any task with 3+ steps or an architectural
   decision. Write the plan to `tasks/todo.md` as checkable items.
2. Check the plan with me before implementing.
3. Track progress: mark `todo.md` items complete as you go.
4. If something goes sideways, STOP and re-plan — don't keep pushing.
5. Explain changes at a high level as you go.
6. On completion, add a review section to `tasks/todo.md`.

## Verify before done
- Never mark a task complete without proving it works.
- Proof = `pnpm -r typecheck && pnpm -r lint && pnpm -r build` clean, migrations
  apply, and the phase's Definition of Done is demonstrably met — state how you
  verified (screenshot, curl, or a smoke check).
- Ask: "Would a staff engineer approve this?"

## Subagents
- Use subagents for research, exploration, and parallel analysis to keep the main
  context clean. One focused task per subagent.
- Don't use subagents to build ahead of the current phase.

## Self-improvement
- After ANY correction from me, append the pattern + a preventing rule to
  `tasks/lessons.md`. Review `lessons.md` at session start.

## Core principles
- Simplicity first: smallest change that solves it. Touch only what's needed.
- No laziness: find root causes, no temp patches, senior-dev standards.
- Minimal impact: don't introduce incidental changes or bugs.
- TypeScript strict, no `any`. Verify the Clerk token server-side on every api
  mutation — never trust the client for auth or role.
- Never commit real `.env` files or secrets.
