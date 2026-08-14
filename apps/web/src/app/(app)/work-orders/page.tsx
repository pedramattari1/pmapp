import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Work Orders</h1>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const isActive = f.value === active;
          const href = f.value ? `/work-orders?status=${f.value}` : "/work-orders";
          return (
            <Link
              key={f.label}
              href={href}
              className={`rounded-full border px-3 py-1 text-sm ${
                isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No work orders.</p>
      ) : (
        <div className="space-y-2">
          {items.map((wo) => (
            <Link
              key={wo.id}
              href={`/work-orders/${wo.id}`}
              className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <div>
                <div className="font-medium">{wo.title}</div>
                <div className="text-sm text-muted-foreground">
                  {wo.assignee ? `Assigned to ${wo.assignee.name}` : "Unassigned"}
                  {wo.dueDate ? ` · due ${wo.dueDate}` : ""}
                  {wo.task ? ` · from ${wo.task.template.title}` : ""}
                </div>
              </div>
              <WorkOrderStatusBadge status={wo.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
