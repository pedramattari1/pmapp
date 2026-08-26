"use client";

import { useAuth } from "@clerk/nextjs";
import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createTemplate,
  updateTemplate,
  type AssetSummary,
  type Frequency,
  type ReadingSpec,
  type TemplateAdmin,
} from "@/lib/api";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const selectClass =
  "h-9 w-full rounded-lg border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function TemplateEditor({
  template,
  assets,
  onClose,
  onSaved,
}: {
  template: TemplateAdmin | null; // null = create
  assets: AssetSummary[];
  onClose: () => void;
  onSaved: (t: TemplateAdmin, isNew: boolean) => void;
}) {
  const { getToken } = useAuth();
  const isNew = template === null;

  const [title, setTitle] = useState(template?.title ?? "");
  const [category, setCategory] = useState(template?.category ?? "General");
  const [frequency, setFrequency] = useState<Frequency>(template?.frequency ?? "MONTHLY");
  const [weekday, setWeekday] = useState<number>(template?.weekday ?? 1);
  const [dayOfMonth, setDayOfMonth] = useState<number>(template?.dayOfMonth ?? 1);
  const [assetId, setAssetId] = useState<string>(template?.asset?.id ?? "");
  const [checklist, setChecklist] = useState<string[]>(
    template?.checklistItems.length ? template.checklistItems : [""],
  );
  const [readings, setReadings] = useState<ReadingSpec[]>(
    template?.requiredReadings ?? [],
  );
  const [active, setActive] = useState<boolean>(template?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError(null);
    const input = {
      title: title.trim(),
      category: category.trim() || "General",
      frequency,
      checklistItems: checklist.map((c) => c.trim()).filter(Boolean),
      requiredReadings: readings
        .map((r) => ({ type: r.type.trim(), unit: r.unit.trim() }))
        .filter((r) => r.type),
      weekday: frequency === "WEEKLY" ? weekday : null,
      dayOfMonth: frequency === "MONTHLY" ? dayOfMonth : null,
      assetId: assetId || null,
      active,
    };
    try {
      const token = await getToken();
      const saved = isNew
        ? await createTemplate(token, input)
        : await updateTemplate(token, template.id, input);
      onSaved(saved, isNew);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center">
      <div className="card-surface my-auto w-full max-w-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isNew ? "New template" : "Edit template"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid gap-1">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label>Category</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label>Asset (optional)</Label>
              <select
                className={selectClass}
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
              >
                <option value="">None</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Frequency + schedule */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label>Frequency</Label>
              <select
                className={selectClass}
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
            {frequency === "WEEKLY" && (
              <div className="grid gap-1">
                <Label>Day of week</Label>
                <select
                  className={selectClass}
                  value={weekday}
                  onChange={(e) => setWeekday(Number(e.target.value))}
                >
                  {WEEKDAYS.map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {frequency === "MONTHLY" && (
              <div className="grid gap-1">
                <Label>Day of month (1–31)</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Number(e.target.value))}
                />
              </div>
            )}
          </div>

          {/* Checklist */}
          <div className="grid gap-2">
            <Label>Checklist items</Label>
            {checklist.map((item, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={item}
                  placeholder={`Item ${i + 1}`}
                  onChange={(e) =>
                    setChecklist((c) => c.map((x, j) => (j === i ? e.target.value : x)))
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setChecklist((c) => c.filter((_, j) => j !== i))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setChecklist((c) => [...c, ""])}
            >
              + Add item
            </Button>
          </div>

          {/* Required readings */}
          <div className="grid gap-2">
            <Label>Required readings</Label>
            {readings.map((r, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  className="flex-1"
                  placeholder="Type (e.g. Fuel level)"
                  value={r.type}
                  onChange={(e) =>
                    setReadings((rs) =>
                      rs.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)),
                    )
                  }
                />
                <Input
                  className="w-28"
                  placeholder="Unit (%)"
                  value={r.unit}
                  onChange={(e) =>
                    setReadings((rs) =>
                      rs.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setReadings((rs) => rs.filter((_, j) => j !== i))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReadings((rs) => [...rs, { type: "", unit: "" }])}
            >
              + Add reading
            </Button>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Active (generates tasks)
          </label>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
          {error && <span className="mr-auto text-sm text-red-600">{error}</span>}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : isNew ? "Create template" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
