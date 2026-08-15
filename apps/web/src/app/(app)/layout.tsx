import { currentUser } from "@clerk/nextjs/server";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const role = String(user?.publicMetadata?.role ?? "VIEWER");
  const isManager = role === "ADMIN" || role === "MANAGER";
  const name =
    user?.fullName ??
    user?.primaryEmailAddress?.emailAddress ??
    "Signed in";

  return (
    <AppShell name={name} role={role} isManager={isManager}>
      {children}
    </AppShell>
  );
}
