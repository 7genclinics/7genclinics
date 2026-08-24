"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { getMasterMedicines, upsertMasterMedicine } from "@/lib/clinic/api";
import { MEDICINE_CATEGORIES, type MasterMedicine } from "@/lib/clinic/types";
import { getErrorMessage } from "@/lib/errors";
import { Loader2 } from "lucide-react";

export default function AdminMedicinesPage() {
  const [rows, setRows] = useState<MasterMedicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("tablet");
  const [doses, setDoses] = useState("500 mg");
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await getMasterMedicines(true));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load medicines"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const reset = () => {
    setEditingId(null);
    setName("");
    setCategory("tablet");
    setDoses("500 mg");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await upsertMasterMedicine({
        id: editingId ?? undefined,
        name,
        category,
        dosage_options: doses.split(",").map((d) => d.trim()).filter(Boolean),
        is_active: true,
      });
      reset();
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save medicine"));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (row: MasterMedicine) => {
    try {
      await upsertMasterMedicine({ ...row, is_active: !row.is_active });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Master medicines</h2>
        <p className="text-sm text-muted-foreground">
          Shared catalog doctors can import into their own prescribing lists.
        </p>
      </div>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{editingId ? "Edit medicine" : "Add medicine"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-4" onSubmit={(e) => void save(e)}>
            <div className="space-y-1 sm:col-span-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <select
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {MEDICINE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Dosages</Label>
              <Input value={doses} onChange={(e) => setDoses(e.target.value)} />
            </div>
            <div className="sm:col-span-4 flex gap-2">
              <Button disabled={saving} type="submit">
                {saving ? "Saving…" : editingId ? "Update" : "Add to master"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={reset}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catalog</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            </div>
          ) : (
            <ul className="divide-y">
              {rows.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {row.name}{" "}
                      <span className="text-xs capitalize text-muted-foreground">{row.category}</span>
                      {!row.is_active && (
                        <span className="ml-2 text-xs text-rose-600">inactive</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{row.dosage_options.join(", ")}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(row.id);
                        setName(row.name);
                        setCategory(row.category);
                        setDoses(row.dosage_options.join(", "));
                      }}
                    >
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void toggle(row)}>
                      {row.is_active ? "Disable" : "Enable"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
