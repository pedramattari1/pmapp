import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TaskDetailForm } from "@/components/task-detail";
import { getTask } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { getToken } = await auth();
  const token = await getToken();

  let task;
  try {
    task = await getTask(token, id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link href="/today" className="text-sm text-muted-foreground hover:underline">
        ← Back to Today
      </Link>
      <TaskDetailForm initial={task} />
    </div>
  );
}
