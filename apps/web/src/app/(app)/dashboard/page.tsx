import { auth } from "@clerk/nextjs/server";
import { AlertTriangle, CheckCircle2, ClipboardList, Wrench } from "lucide-react";
import { ExportButtons } from "@/components/export-buttons";
import { PageHeader } from "@/components/page-header";
import { WorkOrderStatusBadge } from "@/components/status-badge";
import { getDashboard, type DashboardData } from "@/lib/api";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "success" | "danger" | "muted";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-50 text-emerald-600",
    danger: "bg-red-50 text-red-600",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between">
        <span className="section-label">{label}</span>
        <span className={`rounded-lg p-1.5 ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-sm text-muted-foreground">{hint}</div>}
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
      <>
        <PageHeader title="Dashboard" />
        <div className="card-surface p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Managers only — your role doesn&apos;t have access to this page.
          </p>
        </div>
      </>
    );
  }

  const pct = Math.round(data.today.completionRate * 100);

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Overview · ${data.date}`} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Completed today"
          value={`${data.today.completed}/${data.today.total}`}
          hint="Tasks marked complete"
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Completion rate"
          value={`${pct}%`}
          icon={ClipboardList}
          tone="primary"
        />
        <StatCard
          label="Overdue tasks"
          value={String(data.overdueCount)}
          hint={data.overdueCount === 0 ? "All caught up" : "Need attention"}
          icon={AlertTriangle}
          tone={data.overdueCount === 0 ? "muted" : "danger"}
        />
      </div>

      {/* Completion progress */}
      <div className="card-surface mt-4 p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Today&apos;s progress</span>
          <span className="text-muted-foreground">{pct}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Open work orders by status */}
        <section className="card-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Open work orders</h2>
          </div>
          {data.openWorkOrdersByStatus.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open work orders.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {data.openWorkOrdersByStatus.map((w) => (
                <div
                  key={w.status}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <WorkOrderStatusBadge status={w.status} />
                  <span className="text-lg font-semibold">{w.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent activity */}
        <section className="card-surface p-5">
          <h2 className="mb-4 text-sm font-semibold">Recent activity</h2>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.recentActivity.map((a, i) => (
                <li key={i} className="flex items-start justify-between gap-3 text-sm">
                  <span>
                    <span className="font-medium">{a.user}</span>{" "}
                    <span className="text-muted-foreground">
                      {a.action.toLowerCase().replace(/_/g, " ")} · {a.entity}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(a.at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Export */}
      <section className="card-surface mt-4 p-5">
        <h2 className="mb-1 text-sm font-semibold">Export</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Download tasks and work orders for a date range (audit).
        </p>
        <ExportButtons />
      </section>
    </>
  );
}
