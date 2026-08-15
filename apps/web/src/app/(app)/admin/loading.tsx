import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <>
      <PageHeader title="Admin" subtitle="Loading…" />
      {[0, 1].map((s) => (
        <section key={s} className="mb-6">
          <Skeleton className="mb-2 h-3 w-28" />
          <div className="card-surface divide-y divide-border">
            {[0, 1, 2].map((r) => (
              <div key={r} className="flex items-center justify-between px-4 py-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
