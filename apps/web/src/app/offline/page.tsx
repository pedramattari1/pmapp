export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-sm text-muted-foreground">
        No connection right now. Any task work you save will be queued on this
        device and synced automatically when you&apos;re back online.
      </p>
    </main>
  );
}
