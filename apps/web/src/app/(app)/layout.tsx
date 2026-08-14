import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
          </nav>
        </div>
        <UserButton />
      </header>
      <main className="mx-auto max-w-3xl p-6">{children}</main>
    </div>
  );
}
