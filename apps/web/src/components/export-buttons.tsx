"use client";

import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchExport } from "@/lib/api";

const EXPORTS = [
  { path: "/export/tasks.csv", label: "Tasks CSV", file: "tasks.csv" },
  { path: "/export/tasks.pdf", label: "Tasks PDF", file: "tasks.pdf" },
  { path: "/export/work-orders.csv", label: "Work Orders CSV", file: "work-orders.csv" },
];

export function ExportButtons() {
  const { getToken } = useAuth();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(path: string, file: string) {
    setBusy(file);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (from) q.set("from", from);
      if (to) q.set("to", to);
      const qs = q.toString() ? `?${q.toString()}` : "";
      const token = await getToken();
      const blob = await fetchExport(token, `${path}${qs}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <Label>From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <Label>To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {EXPORTS.map((e) => (
          <Button
            key={e.file}
            variant="outline"
            onClick={() => download(e.path, e.file)}
            disabled={busy !== null}
          >
            {busy === e.file ? "Preparing…" : e.label}
          </Button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
