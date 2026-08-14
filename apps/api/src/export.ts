import { Router } from "express";
import PDFDocument from "pdfkit";
import { requireAuth, requireRole } from "./auth.js";
import { prisma } from "./prisma.js";

export const exportRouter = Router();

// All export routes are manager-only.
exportRouter.use(requireAuth, requireRole("ADMIN", "MANAGER"));

function parseRange(req: {
  query: Record<string, unknown>;
}): { from: Date; to: Date } {
  const now = new Date();
  const toStr = typeof req.query.to === "string" ? req.query.to : null;
  const fromStr = typeof req.query.from === "string" ? req.query.from : null;
  const to = toStr ? new Date(`${toStr}T23:59:59.999Z`) : now;
  const from = fromStr
    ? new Date(`${fromStr}T00:00:00.000Z`)
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
}

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  return lines.join("\r\n");
}

// GET /export/tasks.csv?from&to — completed tasks in range.
exportRouter.get("/tasks.csv", async (req, res) => {
  const { from, to } = parseRange(req);
  const tasks = await prisma.task.findMany({
    where: { dueDate: { gte: from, lte: to } },
    select: {
      dueDate: true,
      status: true,
      template: { select: { title: true, category: true, frequency: true } },
      assignee: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
  });
  const csv = toCsv(
    ["Date", "Task", "Category", "Frequency", "Status", "Assignee"],
    tasks.map((t) => [
      t.dueDate.toISOString().slice(0, 10),
      t.template.title,
      t.template.category,
      t.template.frequency,
      t.status,
      t.assignee?.name ?? "",
    ]),
  );
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="tasks.csv"');
  res.send(csv);
});

// GET /export/work-orders.csv?from&to
exportRouter.get("/work-orders.csv", async (req, res) => {
  const { from, to } = parseRange(req);
  const wos = await prisma.workOrder.findMany({
    where: { createdAt: { gte: from, lte: to } },
    select: {
      createdAt: true,
      title: true,
      status: true,
      dueDate: true,
      assignee: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const csv = toCsv(
    ["Created", "Title", "Status", "Due", "Assignee"],
    wos.map((w) => [
      w.createdAt.toISOString().slice(0, 10),
      w.title,
      w.status,
      w.dueDate ? w.dueDate.toISOString().slice(0, 10) : "",
      w.assignee?.name ?? "",
    ]),
  );
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="work-orders.csv"');
  res.send(csv);
});

// GET /export/tasks.pdf?from&to — a simple PDF report of tasks in range.
exportRouter.get("/tasks.pdf", async (req, res) => {
  const { from, to } = parseRange(req);
  const tasks = await prisma.task.findMany({
    where: { dueDate: { gte: from, lte: to } },
    select: {
      dueDate: true,
      status: true,
      template: { select: { title: true } },
      assignee: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="tasks.pdf"');

  const doc = new PDFDocument({ margin: 40, size: "LETTER" });
  doc.pipe(res);
  doc.fontSize(16).text("The Fay — Task Report", { underline: true });
  doc
    .fontSize(10)
    .text(
      `Range: ${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)}`,
    );
  doc.moveDown();
  if (tasks.length === 0) {
    doc.text("No tasks in range.");
  } else {
    for (const t of tasks) {
      doc
        .fontSize(10)
        .text(
          `${t.dueDate.toISOString().slice(0, 10)}  [${t.status}]  ${t.template.title}` +
            (t.assignee ? `  — ${t.assignee.name}` : ""),
        );
    }
  }
  doc.end();
});
