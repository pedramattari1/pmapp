import cors from "cors";
import express from "express";
import { requireAuth } from "./auth.js";
import { env } from "./env.js";

const app = express();

app.use(express.json());
app.use(cors({ origin: env.WEB_ORIGIN }));

// Public health check — no auth. Used by Railway and local smoke checks.
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Protected: returns the authenticated user's id + role (role from Clerk
// public metadata, default VIEWER). Proves the web↔api Clerk round-trip.
app.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

app.listen(env.PORT, () => {
  console.log(`api listening on http://localhost:${env.PORT}`);
});
