import { createClerkClient } from "@clerk/backend";
import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { invalidateAuthCache, requireAuth, requireRole } from "./auth.js";
import { env } from "./env.js";
import { prisma } from "./prisma.js";
import { buildingToday } from "./time.js";

export const adminRouter = Router();

const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

const ROLES = ["ADMIN", "MANAGER", "ENGINEER", "TECH", "VIEWER"] as const;
type Role = (typeof ROLES)[number];
function isRole(v: unknown): v is Role {
  return typeof v === "string" && (ROLES as readonly string[]).includes(v);
}

const FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY"] as const;

const TEMPLATE_SELECT = {
  id: true,
  title: true,
  category: true,
  frequency: true,
  weekday: true,
  dayOfMonth: true,
  active: true,
  checklistItems: true,
  requiredReadings: true,
  asset: { select: { id: true, name: true } },
} satisfies Prisma.PMTemplateSelect;

function loadTemplate(id: string) {
  return prisma.pMTemplate.findUnique({ where: { id }, select: TEMPLATE_SELECT });
}

type Frequency = (typeof FREQUENCIES)[number];

interface TemplateFields {
  title?: string;
  category?: string;
  frequency?: Frequency;
  checklistItems?: string[];
  requiredReadings?: { type: string; unit: string }[];
  weekday?: number | null;
  dayOfMonth?: number | null;
  active?: boolean;
  assetId: string | null;
  assetIdProvided: boolean;
}

// Validate + normalize a template create/update body. Returns {error} on bad input.
function parseTemplateBody(raw: unknown): TemplateFields | { error: string } {
  const body = (raw ?? {}) as Record<string, unknown>;
  const out: TemplateFields = { assetId: null, assetIdProvided: false };

  if (typeof body.title === "string" && body.title.trim()) out.title = body.title.trim();
  if (typeof body.category === "string") out.category = body.category.trim();
  if (body.frequency !== undefined) {
    if (!(FREQUENCIES as readonly string[]).includes(String(body.frequency))) {
      return { error: "Invalid frequency" };
    }
    out.frequency = body.frequency as Frequency;
  }
  if (Array.isArray(body.checklistItems)) {
    out.checklistItems = body.checklistItems
      .map((x) => String(x).trim())
      .filter((x) => x.length > 0);
  }
  if (Array.isArray(body.requiredReadings)) {
    out.requiredReadings = body.requiredReadings
      .map((r) => r as { type?: unknown; unit?: unknown })
      .filter((r) => typeof r.type === "string" && (r.type as string).trim())
      .map((r) => ({
        type: String(r.type).trim(),
        unit: typeof r.unit === "string" ? r.unit.trim() : "",
      }));
  }
  if (body.weekday !== undefined)
    out.weekday = body.weekday === null || body.weekday === "" ? null : Number(body.weekday);
  if (body.dayOfMonth !== undefined)
    out.dayOfMonth =
      body.dayOfMonth === null || body.dayOfMonth === "" ? null : Number(body.dayOfMonth);
  if (typeof body.active === "boolean") out.active = body.active;

  out.assetIdProvided = "assetId" in body;
  out.assetId = typeof body.assetId === "string" && body.assetId ? body.assetId : null;

  return out;
}

// --- Templates (ADMIN | MANAGER) ---

adminRouter.get(
  "/templates",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  async (_req, res) => {
    const templates = await prisma.pMTemplate.findMany({
      select: {
        id: true,
        title: true,
        category: true,
        frequency: true,
        weekday: true,
        dayOfMonth: true,
        active: true,
        checklistItems: true,
        requiredReadings: true,
        asset: { select: { id: true, name: true } },
      },
      orderBy: { title: "asc" },
    });
    res.json({ templates });
  },
);

adminRouter.post(
  "/templates/:id",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  async (req, res) => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: "Missing id" });
      return;
    }
    const existing = await prisma.pMTemplate.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    const p = parseTemplateBody(req.body);
    if ("error" in p) {
      res.status(400).json({ error: p.error });
      return;
    }
    const data: Prisma.PMTemplateUpdateInput = {};
    if (p.title !== undefined) data.title = p.title;
    if (p.category !== undefined) data.category = p.category;
    if (p.frequency !== undefined) data.frequency = p.frequency;
    if (p.checklistItems !== undefined) data.checklistItems = p.checklistItems;
    if (p.requiredReadings !== undefined) data.requiredReadings = p.requiredReadings;
    if (p.weekday !== undefined) data.weekday = p.weekday;
    if (p.dayOfMonth !== undefined) data.dayOfMonth = p.dayOfMonth;
    if (p.active !== undefined) data.active = p.active;
    if (p.assetIdProvided) {
      data.asset = p.assetId ? { connect: { id: p.assetId } } : { disconnect: true };
    }

    await prisma.$transaction(async (tx) => {
      await tx.pMTemplate.update({ where: { id }, data });
      await tx.auditLog.create({
        data: { userId: req.user!.id, entity: "PMTemplate", entityId: id, action: "UPDATE" },
      });
    });

    res.json(await loadTemplate(id));
  },
);

// Create a new template (ADMIN | MANAGER).
adminRouter.post(
  "/templates",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  async (req, res) => {
    const p = parseTemplateBody(req.body);
    if ("error" in p) {
      res.status(400).json({ error: p.error });
      return;
    }
    if (!p.title || !p.frequency) {
      res.status(400).json({ error: "Title and frequency are required" });
      return;
    }
    const created = await prisma.pMTemplate.create({
      data: {
        title: p.title,
        frequency: p.frequency,
        category: p.category ?? "General",
        checklistItems: p.checklistItems ?? [],
        requiredReadings: p.requiredReadings ?? [],
        weekday: p.weekday ?? null,
        dayOfMonth: p.dayOfMonth ?? null,
        active: p.active ?? true,
        assetId: p.assetId,
      },
      select: { id: true },
    });
    await prisma.auditLog.create({
      data: { userId: req.user!.id, entity: "PMTemplate", entityId: created.id, action: "CREATE" },
    });
    res.status(201).json(await loadTemplate(created.id));
  },
);

// Assets list — for the template editor's asset picker.
adminRouter.get(
  "/assets",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  async (_req, res) => {
    const assets = await prisma.asset.findMany({
      select: { id: true, name: true, category: true },
      orderBy: { name: "asc" },
    });
    res.json({ assets });
  },
);

// --- User role change (ADMIN only) ---
// Writes to Clerk public metadata (source of truth) AND our DB.

adminRouter.post(
  "/users/:id/role",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: "Missing id" });
      return;
    }
    const body = req.body as { role?: unknown };
    if (!isRole(body.role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, clerkId: true },
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await clerk.users.updateUserMetadata(user.clerkId, {
      publicMetadata: { role: body.role },
    });
    await prisma.user.update({ where: { id }, data: { role: body.role } });
    invalidateAuthCache(user.clerkId); // role change takes effect immediately
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        entity: "User",
        entityId: id,
        action: `SET_ROLE:${body.role}`,
      },
    });

    res.json({ id, role: body.role });
  },
);

// --- Dashboard (ADMIN | MANAGER) ---

adminRouter.get(
  "/dashboard",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  async (_req, res) => {
    const today = buildingToday();

    const [todayTotal, todayCompleted, overdue, woGroups, recent] =
      await Promise.all([
        prisma.task.count({ where: { dueDate: today } }),
        prisma.task.count({ where: { dueDate: today, status: "COMPLETED" } }),
        prisma.task.count({
          where: { dueDate: { lt: today }, status: { not: "COMPLETED" } },
        }),
        prisma.workOrder.groupBy({
          by: ["status"],
          _count: { _all: true },
          where: { status: { not: "CLOSED" } },
        }),
        prisma.auditLog.findMany({
          take: 10,
          orderBy: { at: "desc" },
          select: {
            entity: true,
            entityId: true,
            action: true,
            at: true,
            user: { select: { name: true } },
          },
        }),
      ]);

    res.json({
      date: today.toISOString().slice(0, 10),
      today: {
        total: todayTotal,
        completed: todayCompleted,
        completionRate: todayTotal === 0 ? 0 : todayCompleted / todayTotal,
      },
      overdueCount: overdue,
      openWorkOrdersByStatus: woGroups.map((g) => ({
        status: g.status,
        count: g._count._all,
      })),
      recentActivity: recent.map((r) => ({
        entity: r.entity,
        entityId: r.entityId,
        action: r.action,
        at: r.at.toISOString(),
        user: r.user.name,
      })),
    });
  },
);
