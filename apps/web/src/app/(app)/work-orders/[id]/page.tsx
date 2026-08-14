import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
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

  return (
    <div className="space-y-6">
      <Link
        href="/work-orders"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Back to Work Orders
      </Link>
      <WorkOrderDetailForm initial={wo} users={users} />
    </div>
  );
}
