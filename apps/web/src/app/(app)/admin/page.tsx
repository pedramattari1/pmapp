import { auth } from "@clerk/nextjs/server";
import { AdminClient } from "@/components/admin-client";
import { PageHeader } from "@/components/page-header";
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
      <>
        <PageHeader title="Admin" />
        <div className="card-surface p-8 text-center text-sm text-muted-foreground">
          Managers only — your role doesn&apos;t have access to this page.
        </div>
      </>
    );
  }

  return <AdminClient templates={templates} users={users} />;
}
