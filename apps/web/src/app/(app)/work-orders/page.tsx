import { auth } from "@clerk/nextjs/server";
import { ChevronRight, Wrench } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { WorkOrderStatusBadge, WO_STATUS_OPTIONS } from "@/components/status-badge";
import { listWorkOrders, type WorkOrderStatus } from "@/lib/api";

export const dynamic = "force-dynamic";

const FILTERS: { value?: WorkOrderStatus; label: string }[] = [
  { value: undefined, label: "All" },
  ...WO_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
];

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active = WO_STATUS_OPTIONS.find((o) => o.value === status)?.value;

  const { getToken } = await auth();
  const token = await getToken();
  const items = await listWorkOrders(token, active);

  return (
    <>
      <PageHeader title="Work Orders" subtitle={`${items.length} total`} />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const isActive = f.value === active;
          const href = f.value ? `/work-orders?status=${f.value}` : "/work-orders";
          return (
            <Link
              key={f.label}
              href={href}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium">No work orders</p>
            <p className="text-sm text-muted-foreground">
              Flag a task as needing repair to create one.
            </p>
          </div>
        </div>
      ) : (
        <div className="card-surface divide-y divide-border overflow-hidden">
          {items.map((wo) => (
            <Link
              key={wo.id}
              href={`/work-orders/${wo.id}`}
              className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{wo.title}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {wo.assignee ? `Assigned to ${wo.assignee.name}` : "Unassigned"}
                  {wo.dueDate ? ` · due ${wo.dueDate}` : ""}
                  {wo.task ? ` · from ${wo.task.template.title}` : ""}
                </div>
              </div>
              <WorkOrderStatusBadge status={wo.status} />
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
