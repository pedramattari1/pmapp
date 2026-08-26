"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";
import { StatusBadge, STATUS_OPTIONS } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createWorkOrder,
  saveTask,
  type SaveTaskInput,
  type TaskDetail,
  type TaskStatus,
  type UserSummary,
  type WorkOrderDetail,
} from "@/lib/api";
import { enqueueSave } from "@/lib/offline-queue";

interface TickState {
  done: boolean;
  note: string;
}

const DEFICIENCY_STATUSES: TaskStatus[] = [
  "NEEDS_REPAIR",
  "PARTS",
  "VENDOR",
  "FOLLOW_UP",
];

const selectClass =
  "h-9 w-full max-w-xs rounded-lg border border-input bg-card px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function TaskDetailForm({
  initial,
  users,
}: {
  initial: TaskDetail;
  users: UserSummary[];
}) {
  const { getToken } = useAuth();
  const [task, setTask] = useState<TaskDetail>(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ticks, setTicks] = useState<Record<string, TickState>>(() => {
    const byLabel = new Map(task.checklistTicks.map((t) => [t.label, t]));
    const out: Record<string, TickState> = {};
    for (const label of task.template.checklistItems) {
      const saved = byLabel.get(label);
      out[label] = { done: saved?.done ?? false, note: saved?.note ?? "" };
    }
    return out;
  });

  const [readings, setReadings] = useState<Record<string, string>>(() => {
    const byType = new Map(task.readings.map((r) => [r.type, r.value]));
    const out: Record<string, string> = {};
    for (const spec of task.template.requiredReadings) {
      out[spec.type] = byType.get(spec.type) ?? "";
    }
    return out;
  });

  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [assigneeId, setAssigneeId] = useState<string>(task.assignee?.id ?? "");

  const [woTitle, setWoTitle] = useState(`${task.template.title} — deficiency`);
  const [woDesc, setWoDesc] = useState("");
  const [woAssignee, setWoAssignee] = useState("");
  const [creatingWo, setCreatingWo] = useState(false);
  const [createdWo, setCreatedWo] = useState<WorkOrderDetail | null>(null);

  const [newUrl, setNewUrl] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<
    { url: string; caption?: string }[]
  >([]);

  const doneCount = Object.values(ticks).filter((t) => t.done).length;
  const totalCount = task.template.checklistItems.length;

  function addAttachment() {
    const url = newUrl.trim();
    if (!url) return;
    setPendingAttachments((p) => [
      ...p,
      { url, caption: newCaption.trim() || undefined },
    ]);
    setNewUrl("");
    setNewCaption("");
  }

  async function onCreateWorkOrder() {
    setCreatingWo(true);
    setError(null);
    try {
      const token = await getToken();
      const wo = await createWorkOrder(token, {
        title: woTitle.trim() || task.template.title,
        description: woDesc.trim(),
        taskId: task.id,
        assigneeId: woAssignee || undefined,
      });
      setCreatedWo(wo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create work order");
    } finally {
      setCreatingWo(false);
    }
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    setQueued(false);
    const input: SaveTaskInput = {
      status,
      assigneeId: assigneeId || null,
      ticks: task.template.checklistItems.map((label) => ({
        label,
        done: ticks[label]?.done ?? false,
        note: ticks[label]?.note || undefined,
      })),
      readings: task.template.requiredReadings.map((spec) => ({
        type: spec.type,
        value: readings[spec.type] ?? "",
        unit: spec.unit,
      })),
      attachments: pendingAttachments,
    };
    try {
      const token = await getToken();
      const updated = await saveTask(token, task.id, input);
      setTask(updated);
      setPendingAttachments([]);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (err) {
      const offline =
        (typeof navigator !== "undefined" && !navigator.onLine) ||
        err instanceof TypeError;
      if (offline) {
        enqueueSave(task.id, input);
        setQueued(true);
      } else {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Link
        href="/today"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Today
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title">{task.template.title}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {task.template.category} · {task.template.frequency} · due {task.dueDate}
          </p>
        </div>
        <StatusBadge status={task.status} />
      </div>

      <div className="space-y-4">
        {/* Checklist */}
        <section className="card-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-label">Checklist</h2>
            <span className="text-xs text-muted-foreground">
              {doneCount}/{totalCount} done
            </span>
          </div>
          <div className="space-y-2">
            {task.template.checklistItems.map((label) => (
              <div
                key={label}
                className="rounded-lg border border-border p-3 transition-colors hover:bg-accent/40"
              >
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-6 w-6 shrink-0 accent-[hsl(var(--primary))]"
                    checked={ticks[label]?.done ?? false}
                    onChange={(e) =>
                      setTicks((prev) => ({
                        ...prev,
                        [label]: {
                          done: e.target.checked,
                          note: prev[label]?.note ?? "",
                        },
                      }))
                    }
                  />
                  <span className="text-sm">{label}</span>
                </label>
                <Textarea
                  className="mt-2"
                  placeholder="Note (optional)"
                  value={ticks[label]?.note ?? ""}
                  onChange={(e) =>
                    setTicks((prev) => ({
                      ...prev,
                      [label]: {
                        done: prev[label]?.done ?? false,
                        note: e.target.value,
                      },
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </section>

        {/* Readings */}
        {task.template.requiredReadings.length > 0 && (
          <section className="card-surface p-5">
            <h2 className="section-label mb-3">Readings</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {task.template.requiredReadings.map((spec) => (
                <div key={spec.type} className="grid gap-1">
                  <Label>
                    {spec.type}{" "}
                    <span className="text-muted-foreground">({spec.unit})</span>
                  </Label>
                  <Input
                    value={readings[spec.type] ?? ""}
                    onChange={(e) =>
                      setReadings((prev) => ({ ...prev, [spec.type]: e.target.value }))
                    }
                    placeholder={`Enter ${spec.unit}`}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Status + assignment */}
        <section className="card-surface grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <h2 className="section-label mb-3">Status</h2>
            <select
              className={selectClass}
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <h2 className="section-label mb-3">Assigned to</h2>
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
        </section>

        {/* Deficiency → create a linked work order (only when flagged) */}
        {DEFICIENCY_STATUSES.includes(status) && (
          <section className="card-surface p-5">
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-800">
                Flagged — create a work order
              </h3>
              {createdWo ? (
                <p className="text-sm">
                  Work order created:{" "}
                  <Link
                    href={`/work-orders/${createdWo.id}`}
                    className="font-medium text-primary underline"
                  >
                    {createdWo.title}
                  </Link>
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="grid gap-1">
                    <Label>Title</Label>
                    <Input value={woTitle} onChange={(e) => setWoTitle(e.target.value)} />
                  </div>
                  <div className="grid gap-1">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="What needs fixing?"
                      value={woDesc}
                      onChange={(e) => setWoDesc(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label>Assign to (optional)</Label>
                    <select
                      className={selectClass}
                      value={woAssignee}
                      onChange={(e) => setWoAssignee(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCreateWorkOrder}
                    disabled={creatingWo}
                  >
                    {creatingWo ? "Creating…" : "Create work order"}
                  </Button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Attachments */}
        <section className="card-surface p-5">
          <h2 className="section-label mb-3">Photos / Attachments</h2>
          {task.attachments.length === 0 && pendingAttachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">None yet.</p>
          ) : (
            <ul className="mb-3 space-y-1 text-sm">
              {task.attachments.map((a) => (
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
                <li key={`pending-${i}`} className="break-all text-muted-foreground">
                  {a.caption || a.url} <span className="italic">(unsaved)</span>
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
            <Input
              className="max-w-[12rem]"
              placeholder="Caption (optional)"
              value={newCaption}
              onChange={(e) => setNewCaption(e.target.value)}
            />
            <Button type="button" variant="outline" onClick={addAttachment}>
              Add
            </Button>
          </div>
        </section>
      </div>

      {/* Save bar */}
      <div className="sticky bottom-0 mt-4 flex flex-wrap items-center gap-4 border-t border-border bg-background/80 py-4 backdrop-blur">
        <Button onClick={onSave} disabled={saving} size="lg" className="w-full sm:w-auto">
          {saving ? "Saving…" : "Save"}
        </Button>
        {savedAt && !error && !queued && (
          <span className="text-sm text-emerald-600">Saved at {savedAt}</span>
        )}
        {queued && (
          <span className="text-sm text-amber-600">
            Saved offline — will sync when back online
          </span>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </>
  );
}
