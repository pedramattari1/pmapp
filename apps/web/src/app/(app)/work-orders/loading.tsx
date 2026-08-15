import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkOrdersLoading() {
  return (
    <>
      <PageHeader title="Work Orders" subtitle="Loading…" />
      <div className="mb-5 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-7 w-16 rounded-full" />
        ))}
      </div>
      <div className="card-surface divide-y divide-border">
        {[0, 1, 2].map((r) => (
          <div key={r} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="mt-1.5 h-3 w-40" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </>
  );
}
