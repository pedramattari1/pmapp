import { prisma } from "./prisma.js";
import { buildingToday, dayOfMonthOf, weekdayOf } from "./time.js";

/**
 * On-read task generation. Creates today's Task rows from active PMTemplates:
 *   - DAILY   → every day
 *   - WEEKLY  → when the template's weekday matches today
 *   - MONTHLY → when the template's dayOfMonth matches today
 * Idempotent: the @@unique([templateId, dueDate]) constraint + skipDuplicates
 * means calling this repeatedly (every /today load, by any user) never
 * duplicates a task already generated for the day.
 */
// Remember the last date we already generated for, so repeat /today loads (the
// common case) skip the template scan + createMany entirely. Generation stays
// idempotent regardless; this just avoids redundant round-trips within a day.
let lastGeneratedDate: string | null = null;

export async function generateTasksForToday(
  now: Date = new Date(),
): Promise<{ created: number; dueDate: Date }> {
  const today = buildingToday(now);
  const todayKey = today.toISOString().slice(0, 10);
  if (lastGeneratedDate === todayKey) {
    return { created: 0, dueDate: today };
  }

  const weekday = weekdayOf(today);
  const dayOfMonth = dayOfMonthOf(today);

  const templates = await prisma.pMTemplate.findMany({
    where: { active: true },
    select: { id: true, frequency: true, weekday: true, dayOfMonth: true },
  });

  const due = templates.filter((t) => {
    switch (t.frequency) {
      case "DAILY":
        return true;
      case "WEEKLY":
        return t.weekday === weekday;
      case "MONTHLY":
        return t.dayOfMonth === dayOfMonth;
      default:
        return false;
    }
  });

  if (due.length === 0) {
    lastGeneratedDate = todayKey;
    return { created: 0, dueDate: today };
  }

  const result = await prisma.task.createMany({
    data: due.map((t) => ({
      templateId: t.id,
      dueDate: today,
      status: "OPEN" as const,
    })),
    skipDuplicates: true,
  });

  lastGeneratedDate = todayKey;
  return { created: result.count, dueDate: today };
}
