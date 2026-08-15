"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";
import { WorkOrderStatusBadge, WO_STATUS_OPTIONS } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  updateWorkOrder,
  type UpdateWorkOrderInput,
  type UserSummary,
  type WorkOrderDetail,
  type WorkOrderStatus,
} from "@/lib/api";

const selectClass =
  "h-9 w-full max-w-xs rounded-lg border border-input bg-card px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function WorkOrderDetailForm({
  initial,
  users,
}: {
  initial: WorkOrderDetail;
  users: UserSummary[];
}) {
  const { getToken } = useAuth();
  const [wo, setWo] = useState<WorkOrderDetail>(initial);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [status, setStatus] = useState<WorkOrderStatus>(initial.status);
  const [assigneeId, setAssigneeId] = useState<string>(initial.assignee?.id ?? "");
  const [dueDate, setDueDate] = useState<string>(initial.dueDate?.slice(0, 10) ?? "");
  const [newUrl, setNewUrl] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<{ url: string }[]>(
    [],
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function addAttachment() {
    const url = newUrl.trim();
    if (!url) return;
    setPendingAttachments((p) => [...p, { url }]);
    setNewUrl("");
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const input: UpdateWorkOrderInput = {
        title,
        description,
        status,
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
        attachments: pendingAttachments,
      };
      const token = await getToken();
      const updated = await updateWorkOrder(token, wo.id, input);
      setWo(updated);
      setPendingAttachments([]);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Link
        href="/work-orders"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Work Orders
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title">{wo.title}</h1>
          {wo.task && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              From task: {wo.task.template.title}
            </p>
          )}
        </div>
        <WorkOrderStatusBadge status={wo.status} />
      </div>

      <div className="space-y-4">
        <section className="card-surface space-y-4 p-5">
          <div className="grid gap-1">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1">
              <Label>Status</Label>
              <select
                className={selectClass}
                value={status}
                onChange={(e) => setStatus(e.target.value as WorkOrderStatus)}
              >
                {WO_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <Label>Assignee</Label>
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
              <Label>Due date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="card-surface p-5">
          <h2 className="section-label mb-3">Photos / Attachments</h2>
          {wo.attachments.length === 0 && pendingAttachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">None yet.</p>
          ) : (
            <ul className="mb-3 space-y-1 text-sm">
              {wo.attachments.map((a) => (
                <li key={a.id}>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-primary underline"
                  >
                    {a.caption || a.url}
                  </a>
                </li>
              ))}
              {pendingAttachments.map((a, i) => (
                <li key={`p-${i}`} className="break-all text-muted-foreground">
                  {a.url} <span className="italic">(unsaved)</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-sm"
              placeholder="https://… image URL"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
            />
            <Button type="button" variant="outline" onClick={addAttachment}>
              Add
            </Button>
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 mt-4 flex flex-wrap items-center gap-4 border-t border-border bg-background/80 py-4 backdrop-blur">
        <Button onClick={onSave} disabled={saving} size="lg" className="w-full sm:w-auto">
          {saving ? "Saving…" : "Save"}
        </Button>
        {savedAt && !error && (
          <span className="text-sm text-emerald-600">Saved at {savedAt}</span>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </>
  );
}
