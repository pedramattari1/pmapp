"use client";

import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { StatusBadge, STATUS_OPTIONS } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  saveTask,
  type SaveTaskInput,
  type TaskDetail,
  type TaskStatus,
} from "@/lib/api";

interface TickState {
  done: boolean;
  note: string;
}

export function TaskDetailForm({ initial }: { initial: TaskDetail }) {
  const { getToken } = useAuth();
  const [task, setTask] = useState<TaskDetail>(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Checklist: one row per template item, seeded from saved ticks (by label).
  const [ticks, setTicks] = useState<Record<string, TickState>>(() => {
    const byLabel = new Map(task.checklistTicks.map((t) => [t.label, t]));
    const out: Record<string, TickState> = {};
    for (const label of task.template.checklistItems) {
      const saved = byLabel.get(label);
      out[label] = { done: saved?.done ?? false, note: saved?.note ?? "" };
    }
    return out;
  });

  // Readings: one row per required-reading spec, seeded from saved readings.
  const [readings, setReadings] = useState<Record<string, string>>(() => {
    const byType = new Map(task.readings.map((r) => [r.type, r.value]));
    const out: Record<string, string> = {};
    for (const spec of task.template.requiredReadings) {
      out[spec.type] = byType.get(spec.type) ?? "";
    }
    return out;
  });

  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [newUrl, setNewUrl] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<
    { url: string; caption?: string }[]
  >([]);

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

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const input: SaveTaskInput = {
        status,
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
      const token = await getToken();
      const updated = await saveTask(token, task.id, input);
      setTask(updated);
      setPendingAttachments([]);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{task.template.title}</h1>
          <p className="text-muted-foreground">
            {task.template.category} · {task.template.frequency} · due{" "}
            {task.dueDate}
          </p>
        </div>
        <StatusBadge status={task.status} />
      </div>

      {/* Checklist */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Checklist
        </h2>
        <div className="space-y-3">
          {task.template.checklistItems.map((label) => (
            <div key={label} className="rounded-lg border p-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
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
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Readings
          </h2>
          <div className="space-y-3">
            {task.template.requiredReadings.map((spec) => (
              <div key={spec.type} className="grid gap-1">
                <Label>
                  {spec.type} <span className="text-muted-foreground">({spec.unit})</span>
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

      {/* Status */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Status
        </h2>
        <select
          className="h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={status}
          onChange={(e) => setStatus(e.target.value as TaskStatus)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </section>

      {/* Attachments */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Photos / Attachments
        </h2>
        {task.attachments.length === 0 && pendingAttachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {task.attachments.map((a) => (
              <li key={a.id}>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline break-all"
                >
                  {a.caption || a.url}
                </a>
              </li>
            ))}
            {pendingAttachments.map((a, i) => (
              <li key={`pending-${i}`} className="text-muted-foreground break-all">
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

      <div className="flex items-center gap-4 border-t pt-4">
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {savedAt && !error && (
          <span className="text-sm text-green-600">Saved at {savedAt}</span>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
