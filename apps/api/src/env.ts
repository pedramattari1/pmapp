import "dotenv/config";

/** Read a required env var, throwing at startup if it's missing. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  CLERK_SECRET_KEY: required("CLERK_SECRET_KEY"),
  WEB_ORIGIN: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  PORT: Number(process.env.PORT ?? 8080),
  // Present for future phases; not required to boot Phase 0.
  DATABASE_URL: process.env.DATABASE_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  INTERNAL_RUN_SECRET: process.env.INTERNAL_RUN_SECRET,
} as const;

export type Role = "ADMIN" | "MANAGER" | "ENGINEER" | "TECH" | "VIEWER";
export const DEFAULT_ROLE: Role = "VIEWER";
