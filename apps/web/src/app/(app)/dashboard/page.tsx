import { auth } from "@clerk/nextjs/server";
import { ExportButtons } from "@/components/export-buttons";
import { WorkOrderStatusBadge } from "@/components/status-badge";
import { getDashboard, type DashboardData } from "@/lib/api";

export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const { getToken } = await auth();
  const token = await getToken();

  let data: DashboardData;
  try {
    data = await getDashboard(token);
  } catch {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          Managers only. Your role doesn&apos;t have access to this page.
        </p>
      </div>
    );
  }

  const pct = Math.round(data.today.completionRate * 100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">{data.date}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Today completed" value={`${data.today.completed}/${data.today.total}`} />
        <Stat label="Completion rate" value={`${pct}%`} />
        <Stat label="Overdue tasks" value={String(data.overdueCount)} />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Open work orders by status
        </h2>
        {data.openWorkOrdersByStatus.length === 0 ? (
          <p className="text-sm text-muted-foreground">None open.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {data.openWorkOrdersByStatus.map((w) => (
              <div key={w.status} className="flex items-center gap-2">
                <WorkOrderStatusBadge status={w.status} />
                <span className="text-sm">{w.count}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recent activity
        </h2>
        {data.recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {data.recentActivity.map((a, i) => (
              <li key={i} className="text-muted-foreground">
                <span className="text-foreground">{a.user}</span> {a.action} {a.entity}{" "}
                <span className="opacity-70">
                  · {new Date(a.at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Export (audit)
        </h2>
        <ExportButtons />
      </section>
    </div>
  );
}
