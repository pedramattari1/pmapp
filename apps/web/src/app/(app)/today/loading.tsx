import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function TodayLoading() {
  return (
    <>
      <PageHeader title="Today" subtitle="Loading…" />
      <div className="space-y-6">
        {[0, 1, 2].map((g) => (
          <section key={g}>
            <Skeleton className="mb-2 h-3 w-16" />
            <div className="card-surface divide-y divide-border">
              {[0, 1].map((r) => (
                <div key={r} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="mt-1.5 h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
