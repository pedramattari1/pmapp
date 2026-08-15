import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "./auth.js";
import { generateTasksForToday } from "./generation.js";
import { prisma } from "./prisma.js";

export const tasksRouter = Router();

const TASK_STATUSES = [
  "OPEN",
  "COMPLETED",
  "NEEDS_REPAIR",
  "PARTS",
  "VENDOR",
  "FOLLOW_UP",
] as const;
type TaskStatus = (typeof TASK_STATUSES)[number];

function isTaskStatus(v: unknown): v is TaskStatus {
  return typeof v === "string" && (TASK_STATUSES as readonly string[]).includes(v);
}

// Shared shape for the task detail returned by GET and POST.
const detailInclude = {
  template: {
    select: {
      title: true,
      category: true,
      frequency: true,
      checklistItems: true,
      requiredReadings: true,
    },
  },
  checklistTicks: { select: { label: true, done: true, note: true } },
  readings: { select: { type: true, value: true, unit: true, assetId: true } },
  attachments: { select: { id: true, url: true, caption: true } },
  assignee: { select: { id: true, name: true } },
} satisfies Prisma.TaskInclude;

async function loadDetail(id: string) {
  // Single JOIN instead of one query per relation (was ~5 round-trips).
  return prisma.task.findUnique({
    where: { id },
    include: detailInclude,
    relationLoadStrategy: "join",
  });
}

// GET /tasks/today — on-read generation, then today's tasks (mine + unassigned)
// grouped by frequency.
tasksRouter.get("/today", requireAuth, async (req, res) => {
  const me = req.user!;
  const { dueDate } = await generateTasksForToday();

  const tasks = await prisma.task.findMany({
    where: {
      dueDate,
      OR: [{ assigneeId: me.id }, { assigneeId: null }],
    },
    select: {
      id: true,
      status: true,
      template: { select: { title: true, category: true, frequency: true } },
    },
    orderBy: { template: { title: "asc" } },
  });

  const summary = (t: (typeof tasks)[number]) => ({
    id: t.id,
    status: t.status,
    title: t.template.title,
    category: t.template.category,
    frequency: t.template.frequency,
  });

  res.json({
    date: dueDate.toISOString().slice(0, 10),
    daily: tasks.filter((t) => t.template.frequency === "DAILY").map(summary),
    weekly: tasks.filter((t) => t.template.frequency === "WEEKLY").map(summary),
    monthly: tasks.filter((t) => t.template.frequency === "MONTHLY").map(summary),
  });
});

// GET /tasks/:id — full detail for the task screen.
tasksRouter.get("/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: "Missing task id" });
    return;
  }
  const task = await loadDetail(id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(task);
});

interface TickInput {
  label: string;
  done: boolean;
  note?: string;
}
interface ReadingInput {
  type: string;
  value: string;
  unit: string;
  assetId?: string;
}
interface AttachmentInput {
  url: string;
  caption?: string;
}

// POST /tasks/:id — persist ticks, readings, status, attachment URLs; audit it.
tasksRouter.post("/:id", requireAuth, async (req, res) => {
  const me = req.user!;
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: "Missing task id" });
    return;
  }

  const task = await prisma.task.findUnique({ where: { id }, select: { id: true } });
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const body = req.body as {
    status?: unknown;
    ticks?: TickInput[];
    readings?: ReadingInput[];
    attachments?: AttachmentInput[];
  };

  let newStatus: TaskStatus | undefined;
  if (body.status !== undefined) {
    if (!isTaskStatus(body.status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    newStatus = body.status;
  }

  const ticks = Array.isArray(body.ticks) ? body.ticks : [];
  const readings = Array.isArray(body.readings) ? body.readings : [];
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];

  await prisma.$transaction(async (tx) => {
    for (const t of ticks) {
      await tx.checklistTick.upsert({
        where: { taskId_label: { taskId: id, label: t.label } },
        update: { done: t.done, note: t.note ?? null },
        create: { taskId: id, label: t.label, done: t.done, note: t.note ?? null },
      });
    }

    for (const r of readings) {
      await tx.reading.upsert({
        where: { taskId_type: { taskId: id, type: r.type } },
        update: { value: r.value, unit: r.unit, assetId: r.assetId ?? null },
        create: {
          taskId: id,
          type: r.type,
          value: r.value,
          unit: r.unit,
          assetId: r.assetId ?? null,
        },
      });
    }

    if (attachments.length > 0) {
      const existing = await tx.attachment.findMany({
        where: { taskId: id },
        select: { url: true },
      });
      const seen = new Set(existing.map((a) => a.url));
      const fresh = attachments.filter((a) => a.url && !seen.has(a.url));
      if (fresh.length > 0) {
        await tx.attachment.createMany({
          data: fresh.map((a) => ({
            taskId: id,
            url: a.url,
            caption: a.caption ?? null,
          })),
        });
      }
    }

    if (newStatus !== undefined) {
      await tx.task.update({ where: { id }, data: { status: newStatus } });
    }

    await tx.auditLog.create({
      data: {
        userId: me.id,
        entity: "Task",
        entityId: id,
        action: "SAVE_TASK",
      },
    });
  });

  res.json(await loadDetail(id));
});
