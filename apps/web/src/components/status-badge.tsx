import { cn } from "@/lib/utils";
import type { TaskStatus, WorkOrderStatus } from "@/lib/api";

// Soft, professional status badges — one distinct tone per state.
const base =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";

const dot = "h-1.5 w-1.5 rounded-full";

interface Tone {
  label: string;
  badge: string;
  dot: string;
}

const TASK_TONES: Record<TaskStatus, Tone> = {
  OPEN: { label: "Open", badge: "bg-slate-100 text-slate-700 ring-slate-500/20", dot: "bg-slate-400" },
  COMPLETED: { label: "Completed", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  NEEDS_REPAIR: { label: "Needs Repair", badge: "bg-red-50 text-red-700 ring-red-600/20", dot: "bg-red-500" },
  PARTS: { label: "Parts", badge: "bg-amber-50 text-amber-800 ring-amber-600/20", dot: "bg-amber-500" },
  VENDOR: { label: "Vendor", badge: "bg-violet-50 text-violet-700 ring-violet-600/20", dot: "bg-violet-500" },
  FOLLOW_UP: { label: "Follow-up", badge: "bg-blue-50 text-blue-700 ring-blue-600/20", dot: "bg-blue-500" },
};

const WO_TONES: Record<WorkOrderStatus, Tone> = {
  OPEN: { label: "Open", badge: "bg-red-50 text-red-700 ring-red-600/20", dot: "bg-red-500" },
  PARTS: { label: "Parts", badge: "bg-amber-50 text-amber-800 ring-amber-600/20", dot: "bg-amber-500" },
  VENDOR: { label: "Vendor", badge: "bg-violet-50 text-violet-700 ring-violet-600/20", dot: "bg-violet-500" },
  FOLLOW_UP: { label: "Follow-up", badge: "bg-blue-50 text-blue-700 ring-blue-600/20", dot: "bg-blue-500" },
  CLOSED: { label: "Closed", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
};

export const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = (
  Object.keys(TASK_TONES) as TaskStatus[]
).map((value) => ({ value, label: TASK_TONES[value].label }));

export const WO_STATUS_OPTIONS: { value: WorkOrderStatus; label: string }[] = (
  Object.keys(WO_TONES) as WorkOrderStatus[]
).map((value) => ({ value, label: WO_TONES[value].label }));

export function StatusBadge({ status }: { status: TaskStatus }) {
  const t = TASK_TONES[status];
  return (
    <span className={cn(base, t.badge)}>
      <span className={cn(dot, t.dot)} />
      {t.label}
    </span>
  );
}

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  const t = WO_TONES[status];
  return (
    <span className={cn(base, t.badge)}>
      <span className={cn(dot, t.dot)} />
      {t.label}
    </span>
  );
}
