import { sendOverdueDigestEmail } from "./email.js";
import { prisma } from "./prisma.js";
import { buildingToday } from "./time.js";

/**
 * Compute overdue tasks + open work orders and email a digest to managers.
 * Triggered by POST /internal/run-daily (there is no cron in this build).
 */
export async function runDailyDigest(now: Date = new Date()) {
  const today = buildingToday(now);

  const overdueTasks = await prisma.task.findMany({
    where: { dueDate: { lt: today }, status: { not: "COMPLETED" } },
    select: { dueDate: true, template: { select: { title: true } } },
    orderBy: { dueDate: "asc" },
  });

  const openWorkOrders = await prisma.workOrder.findMany({
    where: { status: { not: "CLOSED" } },
    select: { title: true, status: true },
    orderBy: { createdAt: "asc" },
  });

  const managers = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER"] } },
    select: { email: true },
  });
  const recipients = managers.map((m) => m.email);

  const result = await sendOverdueDigestEmail(recipients, {
    overdue: overdueTasks.map((t) => ({
      title: t.template.title,
      dueDate: t.dueDate.toISOString().slice(0, 10),
    })),
    openWorkOrders: openWorkOrders.map((w) => ({ title: w.title, status: w.status })),
  });

  return {
    date: today.toISOString().slice(0, 10),
    overdueCount: overdueTasks.length,
    openWorkOrderCount: openWorkOrders.length,
    recipientCount: recipients.length,
    email: result,
  };
}
