import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { WorkOrderDetailForm } from "@/components/work-order-detail";
import { getWorkOrder, listUsers } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function WorkOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { getToken } = await auth();
  const token = await getToken();

  let wo;
  try {
    wo = await getWorkOrder(token, id);
  } catch {
    notFound();
  }
  const users = await listUsers(token);

  return <WorkOrderDetailForm initial={wo} users={users} />;
}
