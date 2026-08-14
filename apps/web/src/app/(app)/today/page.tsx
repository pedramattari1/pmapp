import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { getTasksToday, type TaskSummary } from "@/lib/api";

export const dynamic = "force-dynamic";

function TaskCard({ task }: { task: TaskSummary }) {
  return (
    <Link
      href={`/tasks/${task.id}`}
      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
    >
      <div>
        <div className="font-medium">{task.title}</div>
        <div className="text-sm text-muted-foreground">{task.category}</div>
      </div>
      <StatusBadge status={task.status} />
    </Link>
  );
}

function Group({ title, tasks }: { title: string; tasks: TaskSummary[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title} ({tasks.length})
      </h2>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing due.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} />
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Today</h1>
        <p className="text-muted-foreground">
          {today.date} · {total} task{total === 1 ? "" : "s"} due
        </p>
      </div>

      <Group title="Daily" tasks={today.daily} />
      <Group title="Weekly" tasks={today.weekly} />
      <Group title="Monthly" tasks={today.monthly} />
    </div>
  );
}
