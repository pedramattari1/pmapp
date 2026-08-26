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

export interface OverdueTask extends TaskSummary {
  dueDate: string;
}

export interface TodayResponse {
  date: string;
  overdue: OverdueTask[];
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
  assigneeId?: string | null;
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

// ---- Work orders + users (Phase 3) ----

export type WorkOrderStatus = "OPEN" | "PARTS" | "VENDOR" | "FOLLOW_UP" | "CLOSED";

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Me["role"];
}

export interface WorkOrderListItem {
  id: string;
  title: string;
  status: WorkOrderStatus;
  dueDate: string | null;
  task: { id: string; template: { title: string } } | null;
  assignee: { id: string; name: string } | null;
}

export interface WorkOrderDetail {
  id: string;
  title: string;
  description: string;
  status: WorkOrderStatus;
  dueDate: string | null;
  task: { id: string; template: { title: string } } | null;
  assignee: { id: string; name: string; email: string } | null;
  attachments: { id: string; url: string; caption: string | null }[];
}

export interface CreateWorkOrderInput {
  title: string;
  description: string;
  taskId?: string;
  assigneeId?: string;
  dueDate?: string;
}

export interface UpdateWorkOrderInput {
  title?: string;
  description?: string;
  status?: WorkOrderStatus;
  assigneeId?: string | null;
  dueDate?: string | null;
  attachments?: { url: string; caption?: string }[];
}

export async function listWorkOrders(
  token: string | null,
  status?: WorkOrderStatus,
): Promise<WorkOrderListItem[]> {
  const q = status ? `?status=${status}` : "";
  const { items } = await apiFetch<{ items: WorkOrderListItem[] }>(
    `/work-orders${q}`,
    token,
  );
  return items;
}

export function getWorkOrder(
  token: string | null,
  id: string,
): Promise<WorkOrderDetail> {
  return apiFetch<WorkOrderDetail>(`/work-orders/${id}`, token);
}

export function createWorkOrder(
  token: string | null,
  input: CreateWorkOrderInput,
): Promise<WorkOrderDetail> {
  return apiFetch<WorkOrderDetail>("/work-orders", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateWorkOrder(
  token: string | null,
  id: string,
  input: UpdateWorkOrderInput,
): Promise<WorkOrderDetail> {
  return apiFetch<WorkOrderDetail>(`/work-orders/${id}`, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listUsers(token: string | null): Promise<UserSummary[]> {
  const { users } = await apiFetch<{ users: UserSummary[] }>("/users", token);
  return users;
}

// ---- Dashboard / admin / export (Phase 4) ----

export interface DashboardData {
  date: string;
  today: { total: number; completed: number; completionRate: number };
  overdueCount: number;
  openWorkOrdersByStatus: { status: WorkOrderStatus; count: number }[];
  recentActivity: {
    entity: string;
    entityId: string;
    action: string;
    at: string;
    user: string;
  }[];
}

export interface TemplateAdmin {
  id: string;
  title: string;
  category: string;
  frequency: Frequency;
  weekday: number | null;
  dayOfMonth: number | null;
  active: boolean;
  checklistItems: string[];
  requiredReadings: ReadingSpec[];
  asset: { id: string; name: string } | null;
}

export interface UpdateTemplateInput {
  title?: string;
  category?: string;
  frequency?: Frequency;
  checklistItems?: string[];
  requiredReadings?: ReadingSpec[];
  weekday?: number | null;
  dayOfMonth?: number | null;
  active?: boolean;
  assetId?: string | null;
}

export type CreateTemplateInput = UpdateTemplateInput & {
  title: string;
  frequency: Frequency;
};

export interface AssetSummary {
  id: string;
  name: string;
  category: string;
}

export function getDashboard(token: string | null): Promise<DashboardData> {
  return apiFetch<DashboardData>("/admin/dashboard", token);
}

export async function listTemplates(
  token: string | null,
): Promise<TemplateAdmin[]> {
  const { templates } = await apiFetch<{ templates: TemplateAdmin[] }>(
    "/admin/templates",
    token,
  );
  return templates;
}

export function updateTemplate(
  token: string | null,
  id: string,
  input: UpdateTemplateInput,
): Promise<TemplateAdmin> {
  return apiFetch<TemplateAdmin>(`/admin/templates/${id}`, token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createTemplate(
  token: string | null,
  input: CreateTemplateInput,
): Promise<TemplateAdmin> {
  return apiFetch<TemplateAdmin>("/admin/templates", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listAssets(token: string | null): Promise<AssetSummary[]> {
  const { assets } = await apiFetch<{ assets: AssetSummary[] }>(
    "/admin/assets",
    token,
  );
  return assets;
}

export function changeUserRole(
  token: string | null,
  userId: string,
  role: UserSummary["role"],
): Promise<{ id: string; role: UserSummary["role"] }> {
  return apiFetch(`/admin/users/${userId}/role`, token, {
    method: "POST",
    body: JSON.stringify({ role }),
  });
}

/** Fetch an export (CSV/PDF) as a Blob with the bearer token attached. */
export async function fetchExport(
  token: string | null,
  path: string,
): Promise<Blob> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Export ${path} failed: ${res.status}`);
  return res.blob();
}
