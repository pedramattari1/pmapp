import { auth } from "@clerk/nextjs/server";
import { AdminClient } from "@/components/admin-client";
import { listTemplates, listUsers } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { getToken } = await auth();
  const token = await getToken();

  let templates;
  let users;
  try {
    [templates, users] = await Promise.all([
      listTemplates(token),
      listUsers(token),
    ]);
  } catch {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-muted-foreground">
          Managers only. Your role doesn&apos;t have access to this page.
        </p>
      </div>
    );
  }

  return <AdminClient templates={templates} users={users} />;
}
