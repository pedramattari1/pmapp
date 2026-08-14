import { Badge } from "@/components/ui/badge";
import type { TaskStatus } from "@/lib/api";

const STATUS_META: Record<
  TaskStatus,
  { label: string; variant: "secondary" | "success" | "warning" | "danger" }
> = {
  OPEN: { label: "Open", variant: "secondary" },
  COMPLETED: { label: "Completed", variant: "success" },
  NEEDS_REPAIR: { label: "Needs Repair", variant: "danger" },
  PARTS: { label: "Parts", variant: "warning" },
  VENDOR: { label: "Vendor", variant: "warning" },
  FOLLOW_UP: { label: "Follow-up", variant: "warning" },
};

export const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = (
  Object.keys(STATUS_META) as TaskStatus[]
).map((value) => ({ value, label: STATUS_META[value].label }));

export function StatusBadge({ status }: { status: TaskStatus }) {
  const meta = STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
