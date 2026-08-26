"use client";

import { UserButton } from "@clerk/nextjs";
import {
  CalendarDays,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const BASE_NAV: NavItem[] = [
  { label: "Today", href: "/today", icon: CalendarDays },
  { label: "Work Orders", href: "/work-orders", icon: Wrench },
  { label: "Assets", href: "/assets", icon: Package },
];
const MANAGER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Admin", href: "/admin", icon: Settings },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
        F
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold">The Fay</div>
        <div className="text-[11px] text-muted-foreground">PM Platform</div>
      </div>
    </div>
  );
}

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserCard({ name, role }: { name: string; role: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-2.5">
      <UserButton />
      <div className="min-w-0 leading-tight">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{role}</div>
      </div>
    </div>
  );
}

export function AppShell({
  name,
  role,
  isManager,
  children,
}: {
  name: string;
  role: string;
  isManager: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = isManager ? [...BASE_NAV, ...MANAGER_NAV] : BASE_NAV;

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-card px-4 py-5 lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <div className="mt-8 flex-1">
          <NavLinks items={items} pathname={pathname} />
        </div>
        <UserCard name={name} role={role} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur lg:hidden">
        <Logo />
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-border bg-card px-4 py-5">
            <div className="flex items-center justify-between px-2">
              <Logo />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-8 flex-1">
              <NavLinks
                items={items}
                pathname={pathname}
                onNavigate={() => setOpen(false)}
              />
            </div>
            <UserCard name={name} role={role} />
          </aside>
        </div>
      )}

      {/* Content */}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
