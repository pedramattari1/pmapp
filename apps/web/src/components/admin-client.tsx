"use client";

import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
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
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

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
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        active
      </label>
      <Input
        className="min-w-[16rem] flex-1"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <span className="text-xs text-muted-foreground">{template.frequency}</span>
      <Button size="sm" variant="outline" onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save"}
      </Button>
      {msg && <span className="text-xs text-green-600">{msg}</span>}
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
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <div className="text-sm font-medium">{user.name}</div>
        <div className="text-xs text-muted-foreground">{user.email}</div>
      </div>
      <div className="flex items-center gap-2">
        {msg && <span className="text-xs text-green-600">{msg}</span>}
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
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Admin</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Users &amp; roles
        </h2>
        <div className="space-y-2">
          {users.map((u) => (
            <UserRow key={u.id} user={u} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Templates ({templates.length})
        </h2>
        <div className="space-y-2">
          {templates.map((t) => (
            <TemplateRow key={t.id} template={t} />
          ))}
        </div>
      </section>
    </div>
  );
}
