import cors from "cors";
import express from "express";
import { adminRouter } from "./admin.js";
import { requireAuth } from "./auth.js";
import { runDailyDigest } from "./digest.js";
import { env } from "./env.js";
import { exportRouter } from "./export.js";
import { perfCounters, prisma } from "./prisma.js";
import { tasksRouter } from "./tasks.js";
import { workOrdersRouter } from "./workorders.js";

const app = express();

app.use(express.json());
app.use(cors({ origin: env.WEB_ORIGIN }));

// Perf diagnosis: log wall time + DB query count per request when PERF_LOG is set.
if (process.env.PERF_LOG) {
  app.use((req, res, next) => {
    const start = Date.now();
    const q0 = perfCounters.queries;
    res.on("finish", () => {
      console.log(
        `[perf] ${req.method} ${req.path} ${Date.now() - start}ms q=${perfCounters.queries - q0}`,
      );
    });
    next();
  });
}

// Public health check — no auth. Used by Railway and local smoke checks.
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Protected: returns the authenticated user's id + role (role from Clerk
// public metadata, default VIEWER). Proves the web↔api Clerk round-trip.
app.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

// Users list — for the work-order assignee picker.
app.get("/users", requireAuth, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
  res.json({ users });
});

// Task loop: on-read generation + today's list + task detail + save.
app.use("/tasks", tasksRouter);

// Work orders: deficiency tracking + assignment notifications.
app.use("/work-orders", workOrdersRouter);

// Admin surface: templates, user-role changes, dashboard (role-gated inside).
app.use("/admin", adminRouter);

// Audit export (CSV/PDF) — manager-only (gate applied inside the router).
app.use("/export", exportRouter);

// Daily digest trigger. Secret-protected (NOT Clerk auth) — there is no cron;
// an external pinger/scheduler calls this. Verified via INTERNAL_RUN_SECRET.
app.post("/internal/run-daily", async (req, res) => {
  if (!env.INTERNAL_RUN_SECRET) {
    res.status(503).json({ error: "run-daily not configured" });
    return;
  }
  const provided =
    req.get("x-internal-secret") ??
    req.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== env.INTERNAL_RUN_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json(await runDailyDigest());
});

app.listen(env.PORT, () => {
  console.log(`api listening on http://localhost:${env.PORT}`);
});
