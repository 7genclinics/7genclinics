"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useDoctor } from "@/contexts/DoctorContext";
import {
  getDoctorMedicinesAll,
  getMasterMedicines,
  importMasterMedicines,
  upsertDoctorMedicine,
} from "@/lib/clinic/api";
import { MEDICINE_CATEGORIES, type DoctorMedicine, type MasterMedicine } from "@/lib/clinic/types";
import { getErrorMessage } from "@/lib/errors";
import { Loader2 } from "lucide-react";

export default function DoctorMedicinesPage() {
  const { doctorProfile } = useDoctor();
  const [mine, setMine] = useState<DoctorMedicine[]>([]);
  const [master, setMaster] = useState<MasterMedicine[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("tablet");
  const [doses, setDoses] = useState("500 mg");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [masterQuery, setMasterQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const [own, catalog] = await Promise.all([
        getDoctorMedicinesAll(doctorProfile.id),
        getMasterMedicines(),
      ]);
      setMine(own);
      setMaster(catalog);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load medicines"));
    } finally {
      setLoading(false);
    }
  }, [doctorProfile.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const already = useMemo(() => new Set(mine.map((m) => m.name.toLowerCase())), [mine]);
  const filteredMaster = useMemo(() => {
    const q = masterQuery.trim().toLowerCase();
    return master.filter((m) => !q || m.name.toLowerCase().includes(q) || m.category.includes(q));
  }, [master, masterQuery]);

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
      await upsertDoctorMedicine({
        id: editingId ?? undefined,
        doctor_id: doctorProfile.id,
        name,
        category,
        dosage_options: doses.split(",").map((d) => d.trim()).filter(Boolean),
        is_active: true,
      });
      reset();
      setMessage("Medicine saved to your list.");
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save medicine"));
    } finally {
      setSaving(false);
    }
  };

  const importSelected = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const count = await importMasterMedicines(selected);
      setSelected([]);
      setMessage(`Imported ${count} medicine${count === 1 ? "" : "s"} into your list.`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Import failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">My medicines</h2>
        <p className="text-sm text-muted-foreground">
          Import from the clinic master list, then customize dosages. Changes stay on your list only.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add or edit</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={(e) => void save(e)}>
                <div className="space-y-1">
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
                  <Label>Dosage options (comma-separated)</Label>
                  <Input value={doses} onChange={(e) => setDoses(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button disabled={saving} type="submit">
                    {editingId ? "Update" : "Add to my list"}
                  </Button>
                  {editingId && (
                    <Button type="button" variant="outline" onClick={reset}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
              <ul className="mt-6 divide-y">
                {mine.map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium">
                        {m.name}{" "}
                        <span className="text-xs capitalize text-muted-foreground">{m.category}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.dosage_options.join(", ") || "No dose options"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(m.id);
                        setName(m.name);
                        setCategory(m.category);
                        setDoses(m.dosage_options.join(", "));
                      }}
                    >
                      Edit
                    </Button>
                  </li>
                ))}
                {mine.length === 0 && (
                  <li className="py-6 text-center text-sm text-muted-foreground">
                    Your list is empty. Import from the master catalog.
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Master catalog</CardTitle>
              <Button size="sm" disabled={saving || selected.length === 0} onClick={() => void importSelected()}>
                Import selected ({selected.length})
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Search master list"
                value={masterQuery}
                onChange={(e) => setMasterQuery(e.target.value)}
              />
              <ul className="max-h-[28rem] space-y-1 overflow-auto">
                {filteredMaster.map((m) => {
                  const owned = already.has(m.name.toLowerCase());
                  return (
                    <li key={m.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        disabled={owned}
                        checked={owned || selected.includes(m.id)}
                        onChange={(e) =>
                          setSelected((ids) =>
                            e.target.checked ? [...ids, m.id] : ids.filter((id) => id !== m.id)
                          )
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {m.name}{" "}
                          <span className="text-xs capitalize text-muted-foreground">{m.category}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{m.dosage_options.join(", ")}</p>
                      </div>
                      {owned && <span className="text-[11px] text-muted-foreground">In your list</span>}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
