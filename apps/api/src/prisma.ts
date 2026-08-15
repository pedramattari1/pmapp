import { PrismaClient } from "@prisma/client";

// Single shared Prisma client. In dev, reuse across hot reloads to avoid
// exhausting the connection pool.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Lightweight query counter for perf diagnosis (see PERF_LOG middleware).
export const perfCounters = { queries: 0 };

function createClient(): PrismaClient {
  const client = new PrismaClient({ log: [{ emit: "event", level: "query" }] });
  client.$on("query", (e) => {
    perfCounters.queries++;
    if (process.env.PERF_LOG) {
      console.log(`[q ${e.duration}ms] ${e.query.slice(0, 90)}`);
    }
  });
  return client;
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
