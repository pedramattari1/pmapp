import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Loading…" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card-surface p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-8 w-20" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="card-surface mt-4 p-5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-3 h-2.5 w-full rounded-full" />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card-surface p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-10 w-full" />
        </div>
        <div className="card-surface p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-24 w-full" />
        </div>
      </div>
    </>
  );
}
