// The Fay is in San Jose — "today" is the building's local calendar date, not
// UTC. We compute the local Y-M-D and represent it as a UTC-midnight Date so it
// maps cleanly onto Prisma's `@db.Date` column and compares by equality.

export const BUILDING_TZ = "America/Los_Angeles";

/** Today's date in the building's timezone, as a UTC-midnight Date (date-only). */
export function buildingToday(now: Date = new Date()): Date {
  // en-CA formats as YYYY-MM-DD.
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUILDING_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${ymd}T00:00:00.000Z`);
}

/** Weekday of a UTC-midnight date: 0=Sun .. 6=Sat. */
export function weekdayOf(date: Date): number {
  return date.getUTCDay();
}

/** Day-of-month of a UTC-midnight date: 1..31. */
export function dayOfMonthOf(date: Date): number {
  return date.getUTCDate();
}
