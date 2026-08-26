"use client";

import { useAuth } from "@clerk/nextjs";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createWorkOrder, type UserSummary } from "@/lib/api";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function NewWorkOrder({ users }: { users: UserSummary[] }) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate() {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      await createWorkOrder(token, {
        title: title.trim(),
        description: description.trim(),
        assigneeId: assigneeId || undefined,
        dueDate: dueDate || undefined,
      });
      setOpen(false);
      setTitle("");
      setDescription("");
      setAssigneeId("");
      setDueDate("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + New Work Order
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center">
          <div className="card-surface my-auto w-full max-w-lg p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">New work order</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid gap-1">
                <Label>Title</Label>
                <Input
                  value={title}
                  placeholder="e.g. Lobby light out"
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  placeholder="What needs fixing, where?"
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1">
                  <Label>Assign to (optional)</Label>
                  <select
                    className={selectClass}
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1">
                  <Label>Due date (optional)</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
              {error && <span className="mr-auto text-sm text-red-600">{error}</span>}
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={onCreate} disabled={saving}>
                {saving ? "Creating…" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
