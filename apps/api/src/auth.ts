import { createClerkClient, verifyToken } from "@clerk/backend";
import type { NextFunction, Request, Response } from "express";
import { DEFAULT_ROLE, env, type Role } from "./env.js";
import { prisma } from "./prisma.js";

const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

const VALID_ROLES: readonly Role[] = [
  "ADMIN",
  "MANAGER",
  "ENGINEER",
  "TECH",
  "VIEWER",
];

function normalizeRole(value: unknown): Role {
  return VALID_ROLES.includes(value as Role) ? (value as Role) : DEFAULT_ROLE;
}

/** The authenticated user attached to the request by `requireAuth`. */
export interface AuthUser {
  /** Our DB User id (cuid) — used for FK relations (assignee, audit log). */
  id: string;
  clerkId: string;
  role: Role;
}

// Augment Express's Request type so downstream handlers see `req.user`.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Short-lived identity cache keyed by Clerk user id. Avoids a Clerk API call
// (~90ms) + a DB user-upsert on every authenticated request. The token itself is
// still verified per request (networkless, ~1ms); only the identity/role lookup
// is cached. TTL is short so role changes propagate quickly.
const AUTH_TTL_MS = 30_000;
const authCache = new Map<string, { user: AuthUser; exp: number }>();

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

/**
 * Verify the Clerk session token on every mutation/protected route.
 * Never trust the client for identity or role — the role is read server-side
 * from the user's Clerk public metadata.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  try {
    const { sub: userId } = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
    });
    if (!userId) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    // Fast path: recently-resolved identity (skips Clerk call + DB upsert).
    const cached = authCache.get(userId);
    if (cached && cached.exp > Date.now()) {
      req.user = cached.user;
      next();
      return;
    }

    // Role is authoritative from Clerk public metadata, fetched server-side.
    const _t0 = Date.now();
    const clerkUser = await clerk.users.getUser(userId);
    if (process.env.PERF_LOG) {
      console.log(`[perf] clerk.users.getUser ${Date.now() - _t0}ms`);
    }
    const role = normalizeRole(clerkUser.publicMetadata?.role);
    const email =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress ??
      `${userId}@no-email.local`;
    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      email;

    // Sync the Clerk identity into our User table so tasks/audit logs can
    // reference a real row. Keyed by clerkId; role/name/email kept fresh.
    const dbUser = await prisma.user.upsert({
      where: { clerkId: userId },
      update: { role, name, email },
      create: { clerkId: userId, role, name, email },
      select: { id: true },
    });

    const authUser: AuthUser = { id: dbUser.id, clerkId: userId, role };
    authCache.set(userId, { user: authUser, exp: Date.now() + AUTH_TTL_MS });
    req.user = authUser;
    next();
  } catch (err) {
    // Log the reason server-side for ops; don't leak it to clients.
    console.error(
      "[auth] token verification failed:",
      err instanceof Error ? err.message : err,
    );
    res.status(401).json({ error: "Unauthorized" });
  }
}

/** Invalidate a cached identity (e.g. right after a server-side role change). */
export function invalidateAuthCache(clerkId: string): void {
  authCache.delete(clerkId);
}

/**
 * Role gate. Compose AFTER requireAuth: it reads the server-derived role
 * (`req.user.role`, sourced from Clerk public metadata) and rejects with 403 if
 * it isn't in the allowed set. This is the real enforcement — the UI hiding a
 * button is not. 401 if somehow unauthenticated.
 */
export function requireRole(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!allowed.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden", requiredRole: allowed });
      return;
    }
    next();
  };
}
