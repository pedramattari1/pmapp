import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "./auth.js";
import { sendWorkOrderAssignedEmail } from "./email.js";
import { prisma } from "./prisma.js";

export const workOrdersRouter = Router();

const WO_STATUSES = ["OPEN", "PARTS", "VENDOR", "FOLLOW_UP", "CLOSED"] as const;
type WorkOrderStatus = (typeof WO_STATUSES)[number];

function isWoStatus(v: unknown): v is WorkOrderStatus {
  return typeof v === "string" && (WO_STATUSES as readonly string[]).includes(v);
}

function parseDate(v: unknown): Date | null | undefined {
  if (v === undefined) return undefined; // not provided → leave unchanged
  if (v === null || v === "") return null; // explicit clear
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

const detailInclude = {
  task: { select: { id: true, template: { select: { title: true } } } },
  assignee: { select: { id: true, name: true, email: true } },
  attachments: { select: { id: true, url: true, caption: true } },
} satisfies Prisma.WorkOrderInclude;

function loadDetail(id: string) {
  return prisma.workOrder.findUnique({ where: { id }, include: detailInclude });
}

/** Email the assignee when a work order is assigned/reassigned. */
async function notifyAssignment(workOrderId: string, assignedById: string) {
  const wo = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: { assignee: { select: { email: true } } },
  });
  if (!wo?.assignee?.email) return;
  const by = await prisma.user.findUnique({
    where: { id: assignedById },
    select: { name: true },
  });
  await sendWorkOrderAssignedEmail(
    wo.assignee.email,
    {
      id: wo.id,
      title: wo.title,
      description: wo.description,
      status: wo.status,
      dueDate: wo.dueDate,
    },
    by?.name ?? "A manager",
  );
}

// POST /work-orders — create (optionally linked to a task); email on assignment.
workOrdersRouter.post("/", requireAuth, async (req, res) => {
  const me = req.user!;
  const body = req.body as {
    title?: unknown;
    description?: unknown;
    taskId?: unknown;
    assigneeId?: unknown;
    dueDate?: unknown;
  };

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (!title) {
    res.status(400).json({ error: "Title is required" });
    return;
  }
  const dueDate = parseDate(body.dueDate) ?? null;
  const assigneeId =
    typeof body.assigneeId === "string" && body.assigneeId ? body.assigneeId : null;
  const taskId = typeof body.taskId === "string" && body.taskId ? body.taskId : null;

  const created = await prisma.workOrder.create({
    data: { title, description, dueDate, assigneeId, taskId },
    select: { id: true },
  });

  await prisma.auditLog.create({
    data: { userId: me.id, entity: "WorkOrder", entityId: created.id, action: "CREATE" },
  });

  if (assigneeId) await notifyAssignment(created.id, me.id);

  res.status(201).json(await loadDetail(created.id));
});

// GET /work-orders?status=OPEN — list, optional status filter.
workOrdersRouter.get("/", requireAuth, async (req, res) => {
  const statusParam = req.query.status;
  const where: Prisma.WorkOrderWhereInput = {};
  if (typeof statusParam === "string" && isWoStatus(statusParam)) {
    where.status = statusParam;
  }
  const items = await prisma.workOrder.findMany({
    where,
    select: {
      id: true,
      title: true,
      status: true,
      dueDate: true,
      task: { select: { id: true, template: { select: { title: true } } } },
      assignee: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ items });
});

// GET /work-orders/:id — detail.
workOrdersRouter.get("/:id", requireAuth, async (req, res) => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }
  const wo = await loadDetail(id);
  if (!wo) {
    res.status(404).json({ error: "Work order not found" });
    return;
  }
  res.json(wo);
});

// POST /work-orders/:id — update fields/status/assignment/attachments; email on reassign.
workOrdersRouter.post("/:id", requireAuth, async (req, res) => {
  const me = req.user!;
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  const current = await prisma.workOrder.findUnique({
    where: { id },
    select: { assigneeId: true },
  });
  if (!current) {
    res.status(404).json({ error: "Work order not found" });
    return;
  }

  const body = req.body as {
    title?: unknown;
    description?: unknown;
    status?: unknown;
    assigneeId?: unknown;
    dueDate?: unknown;
    attachments?: { url: string; caption?: string }[];
  };

  const data: Prisma.WorkOrderUpdateInput = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if (typeof body.description === "string") data.description = body.description.trim();
  if (body.status !== undefined) {
    if (!isWoStatus(body.status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    data.status = body.status;
  }
  const due = parseDate(body.dueDate);
  if (due !== undefined) data.dueDate = due;

  // assigneeId: string = assign, null/"" = unassign, absent = unchanged.
  let assigneeChanged = false;
  let newAssigneeId: string | null | undefined;
  if (body.assigneeId !== undefined) {
    newAssigneeId =
      typeof body.assigneeId === "string" && body.assigneeId ? body.assigneeId : null;
    data.assignee = newAssigneeId
      ? { connect: { id: newAssigneeId } }
      : { disconnect: true };
    assigneeChanged = newAssigneeId !== current.assigneeId;
  }

  await prisma.$transaction(async (tx) => {
    await tx.workOrder.update({ where: { id }, data });

    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    if (attachments.length > 0) {
      const existing = await tx.attachment.findMany({
        where: { workOrderId: id },
        select: { url: true },
      });
      const seen = new Set(existing.map((a) => a.url));
      const fresh = attachments.filter((a) => a.url && !seen.has(a.url));
      if (fresh.length > 0) {
        await tx.attachment.createMany({
          data: fresh.map((a) => ({
            workOrderId: id,
            url: a.url,
            caption: a.caption ?? null,
          })),
        });
      }
    }

    await tx.auditLog.create({
      data: { userId: me.id, entity: "WorkOrder", entityId: id, action: "UPDATE" },
    });
  });

  // Email only when the assignee actually changed to a real person.
  if (assigneeChanged && newAssigneeId) await notifyAssignment(id, me.id);

  res.json(await loadDetail(id));
});
