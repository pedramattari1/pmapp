import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const role = user?.publicMetadata?.role;
  const isManager = role === "ADMIN" || role === "MANAGER";

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold">The Fay — PM Platform</span>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/today" className="hover:text-foreground">
              Today
            </Link>
            <Link href="/work-orders" className="hover:text-foreground">
              Work Orders
            </Link>
            {isManager && (
              <>
                <Link href="/dashboard" className="hover:text-foreground">
                  Dashboard
                </Link>
                <Link href="/admin" className="hover:text-foreground">
                  Admin
                </Link>
              </>
            )}
          </nav>
        </div>
        <UserButton />
      </header>
      <main className="mx-auto max-w-3xl p-6">{children}</main>
    </div>
  );
}
