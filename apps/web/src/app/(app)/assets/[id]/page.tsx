import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, WorkOrderStatusBadge } from "@/components/status-badge";
import { getAssetHistory, type AssetHistory } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function AssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { getToken } = await auth();
  const token = await getToken();

  let asset: AssetHistory;
  try {
    asset = await getAssetHistory(token, id);
  } catch {
    notFound();
  }

  return (
    <>
      <Link
        href="/assets"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Assets
      </Link>
      <PageHeader
        title={asset.name}
        subtitle={`${asset.category} · ${asset.location}`}
      />

      <div className="space-y-6">
        {/* PM schedules */}
        <section>
          <h2 className="section-label mb-2">PM schedules</h2>
          <div className="card-surface divide-y divide-border overflow-hidden">
            {asset.templates.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No PM templates linked to this asset.
              </p>
            ) : (
              asset.templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium">{t.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.frequency}
                    {t.active ? "" : " · inactive"}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Task history + readings */}
        <section>
          <h2 className="section-label mb-2">History ({asset.recentTasks.length})</h2>
          {asset.recentTasks.length === 0 ? (
            <div className="card-surface px-4 py-6 text-center text-sm text-muted-foreground">
              No logged tasks yet.
            </div>
          ) : (
            <div className="space-y-2">
              {asset.recentTasks.map((t) => (
                <Link
                  key={t.id}
                  href={`/tasks/${t.id}`}
                  className="card-surface block p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {t.templateTitle}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t.dueDate}
                        {t.assignee ? ` · ${t.assignee}` : ""}
                      </div>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                  {t.readings.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {t.readings.map((r, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {r.type}: <span className="font-medium text-foreground">{r.value}</span>{" "}
                          {r.unit}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Work orders */}
        {asset.workOrders.length > 0 && (
          <section>
            <h2 className="section-label mb-2">
              Work orders ({asset.workOrders.length})
            </h2>
            <div className="card-surface divide-y divide-border overflow-hidden">
              {asset.workOrders.map((w) => (
                <Link
                  key={w.id}
                  href={`/work-orders/${w.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{w.title}</div>
                    <div className="text-xs text-muted-foreground">{w.createdAt}</div>
                  </div>
                  <WorkOrderStatusBadge status={w.status} />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
