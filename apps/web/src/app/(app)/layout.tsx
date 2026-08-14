import { UserButton } from "@clerk/nextjs";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="font-semibold">The Fay — PM Platform</span>
        <UserButton />
      </header>
      <main className="mx-auto max-w-2xl p-6">{children}</main>
    </div>
  );
}
