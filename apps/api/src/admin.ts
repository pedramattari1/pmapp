import { createClerkClient } from "@clerk/backend";
import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { requireAuth, requireRole } from "./auth.js";
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

    const body = req.body as {
      title?: unknown;
      category?: unknown;
      frequency?: unknown;
      checklistItems?: unknown;
      weekday?: unknown;
      dayOfMonth?: unknown;
      active?: unknown;
    };

    const data: Prisma.PMTemplateUpdateInput = {};
    if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
    if (typeof body.category === "string") data.category = body.category.trim();
    if (body.frequency !== undefined) {
      if (!(FREQUENCIES as readonly string[]).includes(String(body.frequency))) {
        res.status(400).json({ error: "Invalid frequency" });
        return;
      }
      data.frequency = body.frequency as (typeof FREQUENCIES)[number];
    }
    if (Array.isArray(body.checklistItems)) {
      data.checklistItems = body.checklistItems.map((x) => String(x));
    }
    if (body.weekday !== undefined)
      data.weekday = body.weekday === null ? null : Number(body.weekday);
    if (body.dayOfMonth !== undefined)
      data.dayOfMonth = body.dayOfMonth === null ? null : Number(body.dayOfMonth);
    if (typeof body.active === "boolean") data.active = body.active;

    await prisma.$transaction(async (tx) => {
      await tx.pMTemplate.update({ where: { id }, data });
      await tx.auditLog.create({
        data: { userId: req.user!.id, entity: "PMTemplate", entityId: id, action: "UPDATE" },
      });
    });

    res.json(await prisma.pMTemplate.findUnique({ where: { id } }));
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
