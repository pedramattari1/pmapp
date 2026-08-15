"use client";

import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  changeUserRole,
  updateTemplate,
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

function TemplateRow({ template }: { template: TemplateAdmin }) {
  const { getToken } = useAuth();
  const [title, setTitle] = useState(template.title);
  const [active, setActive] = useState(template.active);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const token = await getToken();
      await updateTemplate(token, template.id, { title, active });
      setMsg("Saved");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        Active
      </label>
      <Input
        className="min-w-[16rem] flex-1"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        {template.frequency}
      </span>
      <Button size="sm" variant="outline" onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save"}
      </Button>
      {msg && <span className="text-xs text-emerald-600">{msg}</span>}
    </div>
  );
}

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

export function AdminClient({
  templates,
  users,
}: {
  templates: TemplateAdmin[];
  users: UserSummary[];
}) {
  return (
    <>
      <PageHeader title="Admin" subtitle="Manage users, roles, and templates" />

      <section className="mb-6">
        <h2 className="section-label mb-2">Users &amp; roles</h2>
        <div className="card-surface divide-y divide-border overflow-hidden">
          {users.map((u) => (
            <UserRow key={u.id} user={u} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-label mb-2">Templates ({templates.length})</h2>
        <div className="card-surface divide-y divide-border overflow-hidden">
          {templates.map((t) => (
            <TemplateRow key={t.id} template={t} />
          ))}
        </div>
      </section>
    </>
  );
}
