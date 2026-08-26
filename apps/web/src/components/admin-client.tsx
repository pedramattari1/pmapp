"use client";

import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { TemplateEditor } from "@/components/template-editor";
import { Button } from "@/components/ui/button";
import {
  changeUserRole,
  type AssetSummary,
  type TemplateAdmin,
  type UserSummary,
} from "@/lib/api";

const ROLES: UserSummary["role"][] = [
  "ADMIN",
  "MANAGER",
  "ENGINEER",
  "TECH",
  "VIEWER",
];
const selectClass =
  "h-9 rounded-lg border border-input bg-card px-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function UserRow({ user }: { user: UserSummary }) {
  const { getToken } = useAuth();
  const [role, setRole] = useState(user.role);
  const [msg, setMsg] = useState<string | null>(null);

  async function onChange(next: UserSummary["role"]) {
    setRole(next);
    setMsg(null);
    try {
      const token = await getToken();
      await changeUserRole(token, user.id, next);
      setMsg("Updated");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
      setRole(user.role);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{user.name}</div>
        <div className="truncate text-xs text-muted-foreground">{user.email}</div>
      </div>
      <div className="flex items-center gap-2">
        {msg && <span className="text-xs text-emerald-600">{msg}</span>}
        <select
          className={selectClass}
          value={role}
          onChange={(e) => onChange(e.target.value as UserSummary["role"])}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function scheduleLabel(t: TemplateAdmin): string {
  if (t.frequency === "DAILY") return "Daily";
  if (t.frequency === "WEEKLY") {
    const d = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][t.weekday ?? 0];
    return `Weekly · ${d}`;
  }
  return `Monthly · day ${t.dayOfMonth ?? 1}`;
}

export function AdminClient({
  templates: initialTemplates,
  users,
  assets,
}: {
  templates: TemplateAdmin[];
  users: UserSummary[];
  assets: AssetSummary[];
}) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [editing, setEditing] = useState<TemplateAdmin | null>(null);
  const [creating, setCreating] = useState(false);

  function handleSaved(saved: TemplateAdmin, isNew: boolean) {
    setTemplates((list) =>
      isNew
        ? [...list, saved].sort((a, b) => a.title.localeCompare(b.title))
        : list.map((t) => (t.id === saved.id ? saved : t)),
    );
    setEditing(null);
    setCreating(false);
  }

  return (
    <>
      <PageHeader title="Admin" subtitle="Manage users, roles, and templates" />

      <section className="mb-8">
        <h2 className="section-label mb-2">Users &amp; roles</h2>
        <div className="card-surface divide-y divide-border overflow-hidden">
          {users.map((u) => (
            <UserRow key={u.id} user={u} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="section-label">Templates ({templates.length})</h2>
          <Button size="sm" onClick={() => setCreating(true)}>
            + New template
          </Button>
        </div>
        <div className="card-surface divide-y divide-border overflow-hidden">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    t.active ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                  title={t.active ? "Active" : "Inactive"}
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{t.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {t.category} · {scheduleLabel(t)}
                    {t.checklistItems.length ? ` · ${t.checklistItems.length} items` : ""}
                    {t.requiredReadings.length
                      ? ` · ${t.requiredReadings.length} readings`
                      : ""}
                  </div>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                Edit
              </Button>
            </div>
          ))}
        </div>
      </section>

      {(editing || creating) && (
        <TemplateEditor
          template={editing}
          assets={assets}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
