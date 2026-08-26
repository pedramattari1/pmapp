import { auth } from "@clerk/nextjs/server";
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getTasksToday, type OverdueTask, type TaskSummary } from "@/lib/api";

export const dynamic = "force-dynamic";

function TaskRow({ task }: { task: TaskSummary }) {
  return (
    <Link
      href={`/tasks/${task.id}`}
      className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{task.title}</div>
        <div className="truncate text-xs text-muted-foreground">
          {task.category}
        </div>
      </div>
      <StatusBadge status={task.status} />
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground" />
    </Link>
  );
}

function Group({ title, tasks }: { title: string; tasks: TaskSummary[] }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="section-label">{title}</h2>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <div className="card-surface px-4 py-6 text-center text-sm text-muted-foreground">
          Nothing due.
        </div>
      ) : (
        <div className="card-surface divide-y divide-border overflow-hidden">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function TodayPage() {
  const { getToken } = await auth();
  const token = await getToken();
  const today = await getTasksToday(token);

  const total = today.daily.length + today.weekly.length + today.monthly.length;
  const formatted = new Date(`${today.date}T00:00:00`).toLocaleDateString(
    undefined,
    { weekday: "long", month: "long", day: "numeric" },
  );

  return (
    <>
      <PageHeader
        title="Today"
        subtitle={`${formatted} · ${total} task${total === 1 ? "" : "s"} due`}
      />

      {today.overdue.length > 0 && (
        <section id="overdue" className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-red-700">
              Overdue ({today.overdue.length})
            </h2>
          </div>
          <div className="overflow-hidden rounded-xl border border-red-200 bg-red-50/40 shadow-sm">
            <div className="divide-y divide-red-100">
              {today.overdue.map((t: OverdueTask) => (
                <Link
                  key={t.id}
                  href={`/tasks/${t.id}`}
                  className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-red-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{t.title}</div>
                    <div className="truncate text-xs text-red-700/80">
                      {t.category} · was due {t.dueDate}
                    </div>
                  </div>
                  <StatusBadge status={t.status} />
                  <ChevronRight className="h-4 w-4 text-red-400 group-hover:text-red-600" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {total === 0 && today.overdue.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium">No tasks due today</p>
            <p className="text-sm text-muted-foreground">
              You&apos;re all caught up. Check back tomorrow.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <Group title="Daily" tasks={today.daily} />
          <Group title="Weekly" tasks={today.weekly} />
          <Group title="Monthly" tasks={today.monthly} />
        </div>
      )}
    </>
  );
}
