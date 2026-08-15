import { auth } from "@clerk/nextjs/server";
import { CheckCircle2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getTasksToday, type TaskSummary } from "@/lib/api";

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

      {total === 0 ? (
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
