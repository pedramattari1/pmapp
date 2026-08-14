/**
 * Tiny typed client for the api service. Attaches the Clerk session token as a
 * Bearer header. The token is supplied by the caller (server: `auth().getToken()`,
 * client: `useAuth().getToken()`) so this module stays agnostic of context.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export interface Me {
  id: string;
  role: "ADMIN" | "MANAGER" | "ENGINEER" | "TECH" | "VIEWER";
}

async function apiFetch<T>(
  path: string,
  token: string | null,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

/** GET /me — the authenticated user's id + role, verified server-side by the api. */
export function getMe(token: string | null): Promise<Me> {
  return apiFetch<Me>("/me", token);
}
