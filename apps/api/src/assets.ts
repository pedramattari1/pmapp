import { Router } from "express";
import { requireAuth } from "./auth.js";
import { prisma } from "./prisma.js";

export const assetsRouter = Router();

// GET /assets — list with a task/work-order count for context.
assetsRouter.get("/", requireAuth, async (_req, res) => {
  const assets = await prisma.asset.findMany({
    select: {
      id: true,
      name: true,
      category: true,
      location: true,
      _count: { select: { templates: true } },
    },
    orderBy: { name: "asc" },
  });
  res.json({
    assets: assets.map((a) => ({
      id: a.id,
      name: a.name,
      category: a.category,
      location: a.location,
      templateCount: a._count.templates,
    })),
  });
});

// GET /assets/:id — the asset + its PM templates, recent task history (with
// readings), and linked work orders. "Everything ever logged on the Generator."
assetsRouter.get("/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  const asset = await prisma.asset.findUnique({
    where: { id },
    select: { id: true, name: true, category: true, location: true },
  });
  if (!asset) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }

  const [templates, tasks, workOrders] = await Promise.all([
    prisma.pMTemplate.findMany({
      where: { assetId: id },
      select: { id: true, title: true, frequency: true, active: true },
      orderBy: { title: "asc" },
    }),
    prisma.task.findMany({
      where: { template: { assetId: id } },
      select: {
        id: true,
        dueDate: true,
        status: true,
        template: { select: { title: true } },
        assignee: { select: { name: true } },
        readings: { select: { type: true, value: true, unit: true } },
      },
      orderBy: { dueDate: "desc" },
      take: 50,
    }),
    prisma.workOrder.findMany({
      where: { task: { template: { assetId: id } } },
      select: { id: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  res.json({
    ...asset,
    templates,
    recentTasks: tasks.map((t) => ({
      id: t.id,
      dueDate: t.dueDate.toISOString().slice(0, 10),
      status: t.status,
      templateTitle: t.template.title,
      assignee: t.assignee?.name ?? null,
      readings: t.readings,
    })),
    workOrders: workOrders.map((w) => ({
      id: w.id,
      title: w.title,
      status: w.status,
      createdAt: w.createdAt.toISOString().slice(0, 10),
    })),
  });
});
