import { auth } from "@clerk/nextjs/server";
import { ChevronRight, Package } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { listBuildingAssets } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const { getToken } = await auth();
  const token = await getToken();
  const assets = await listBuildingAssets(token);

  // Group by category for a tidy registry.
  const byCategory = new Map<string, typeof assets>();
  for (const a of assets) {
    const list = byCategory.get(a.category) ?? [];
    list.push(a);
    byCategory.set(a.category, list);
  }

  return (
    <>
      <PageHeader title="Assets" subtitle={`${assets.length} pieces of equipment`} />
      <div className="space-y-6">
        {[...byCategory.entries()].map(([category, list]) => (
          <section key={category}>
            <h2 className="section-label mb-2">{category}</h2>
            <div className="card-surface divide-y divide-border overflow-hidden">
              {list.map((a) => (
                <Link
                  key={a.id}
                  href={`/assets/${a.id}`}
                  className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Package className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{a.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {a.location} · {a.templateCount} PM schedule
                      {a.templateCount === 1 ? "" : "s"}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
