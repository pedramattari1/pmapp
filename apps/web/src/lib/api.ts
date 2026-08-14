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

// ---- Tasks (Phase 2) ----

export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY";
export type TaskStatus =
  | "OPEN"
  | "COMPLETED"
  | "NEEDS_REPAIR"
  | "PARTS"
  | "VENDOR"
  | "FOLLOW_UP";

export interface TaskSummary {
  id: string;
  status: TaskStatus;
  title: string;
  category: string;
  frequency: Frequency;
}

export interface TodayResponse {
  date: string;
  daily: TaskSummary[];
  weekly: TaskSummary[];
  monthly: TaskSummary[];
}

export interface ReadingSpec {
  type: string;
  unit: string;
}

export interface TaskDetail {
  id: string;
  status: TaskStatus;
  dueDate: string;
  template: {
    title: string;
    category: string;
    frequency: Frequency;
    checklistItems: string[];
    requiredReadings: ReadingSpec[];
  };
  checklistTicks: { label: string; done: boolean; note: string | null }[];
  readings: { type: string; value: string; unit: string; assetId: string | null }[];
  attachments: { id: string; url: string; caption: string | null }[];
  assignee: { id: string; name: string } | null;
}

export interface SaveTaskInput {
  status?: TaskStatus;
  ticks: { label: string; done: boolean; note?: string }[];
  readings: { type: string; value: string; unit: string; assetId?: string }[];
  attachments: { url: string; caption?: string }[];
}

/** GET /tasks/today — on-read generation + today's tasks grouped by frequency. */
export function getTasksToday(token: string | null): Promise<TodayResponse> {
  return apiFetch<TodayResponse>("/tasks/today", token);
}

/** GET /tasks/:id — full task detail. */
export function getTask(token: string | null, id: string): Promise<TaskDetail> {
  return apiFetch<TaskDetail>(`/tasks/${id}`, token);
}

/** POST /tasks/:id — persist ticks, readings, status, attachment URLs. */
export function saveTask(
  token: string | null,
  id: string,
  input: SaveTaskInput,
): Promise<TaskDetail> {
  return apiFetch<TaskDetail>(`/tasks/${id}`, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
