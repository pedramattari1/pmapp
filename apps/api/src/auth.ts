import { createClerkClient, verifyToken } from "@clerk/backend";
import type { NextFunction, Request, Response } from "express";
import { DEFAULT_ROLE, env, type Role } from "./env.js";

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
  id: string;
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

    // Role is authoritative from Clerk public metadata, fetched server-side.
    const user = await clerk.users.getUser(userId);
    req.user = {
      id: userId,
      role: normalizeRole(user.publicMetadata?.role),
    };
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}
