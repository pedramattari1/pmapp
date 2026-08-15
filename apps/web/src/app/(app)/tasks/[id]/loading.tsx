import { Skeleton } from "@/components/ui/skeleton";

export default function TaskLoading() {
  return (
    <>
      <Skeleton className="mb-4 h-4 w-28" />
      <Skeleton className="h-7 w-72" />
      <Skeleton className="mt-2 h-4 w-48" />
      <div className="mt-6 space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card-surface p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-20 w-full" />
          </div>
        ))}
      </div>
    </>
  );
}
