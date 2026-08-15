import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { TaskDetailForm } from "@/components/task-detail";
import { getTask, listUsers } from "@/lib/api";

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
  const users = await listUsers(token);

  return <TaskDetailForm initial={task} users={users} />;
}
