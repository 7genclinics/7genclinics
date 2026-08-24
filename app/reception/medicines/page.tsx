"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  getClinicDoctors,
  getDoctorMedicinesAll,
  getMasterMedicines,
  importMasterMedicinesForDoctor,
  upsertDoctorMedicine,
} from "@/lib/clinic/api";
import {
  MEDICINE_CATEGORIES,
  type ClinicDoctorOption,
  type DoctorMedicine,
  type MasterMedicine,
} from "@/lib/clinic/types";
import { getErrorMessage } from "@/lib/errors";
import { Loader2 } from "lucide-react";

export default function ReceptionMedicinesPage() {
  const [doctors, setDoctors] = useState<ClinicDoctorOption[]>([]);
  const [doctorId, setDoctorId] = useState("");
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

  const selectedDoctor = doctors.find((d) => d.id === doctorId) ?? null;

  const loadDoctors = useCallback(async () => {
    const docs = await getClinicDoctors();
    setDoctors(docs);
    setDoctorId((current) => current || docs[0]?.id || "");
  }, []);

  const loadList = useCallback(async () => {
    if (!doctorId) {
      setMine([]);
      return;
    }
    const [own, catalog] = await Promise.all([
      getDoctorMedicinesAll(doctorId),
      getMasterMedicines(),
    ]);
    setMine(own);
    setMaster(catalog);
  }, [doctorId]);

  useEffect(() => {
    void loadDoctors()
      .catch((err) => setError(getErrorMessage(err, "Failed to load doctors")))
      .finally(() => setLoading(false));
  }, [loadDoctors]);

  useEffect(() => {
    if (!doctorId) return;
    setSelected([]);
    setEditingId(null);
    setMessage(null);
    void loadList().catch((err) => setError(getErrorMessage(err, "Failed to load medicines")));
  }, [doctorId, loadList]);

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
    if (!doctorId) return;
    setSaving(true);
    setError(null);
    try {
      await upsertDoctorMedicine({
        id: editingId ?? undefined,
        doctor_id: doctorId,
        name,
        category,
        dosage_options: doses.split(",").map((d) => d.trim()).filter(Boolean),
        is_active: true,
      });
      reset();
      setMessage(`Saved to ${selectedDoctor?.full_name ?? "doctor"}'s list.`);
      await loadList();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save medicine"));
    } finally {
      setSaving(false);
    }
  };

  const importSelected = async () => {
    if (!doctorId || selected.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const count = await importMasterMedicinesForDoctor(doctorId, selected);
      setSelected([]);
      setMessage(`Added ${count} medicine${count === 1 ? "" : "s"} to ${selectedDoctor?.full_name ?? "the doctor"}.`);
      await loadList();
    } catch (err) {
      setError(getErrorMessage(err, "Import failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Doctor medicines</h2>
          <p className="text-sm text-muted-foreground">
            Add medicines to a doctor&apos;s prescribing list so they appear in consultation.
          </p>
        </div>
        <div className="w-full sm:w-72 space-y-1">
          <Label>Doctor</Label>
          <select
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
          >
            {doctors.length === 0 && <option value="">No doctors</option>}
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}
                {d.specialization ? ` · ${d.specialization}` : ""}
              </option>
            ))}
          </select>
        </div>
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
                  <Button disabled={saving || !doctorId} type="submit">
                    {editingId ? "Update" : "Add to doctor"}
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
                    This doctor has no medicines yet. Add one or import from the master catalog.
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Master catalog</CardTitle>
              <Button size="sm" disabled={saving || selected.length === 0 || !doctorId} onClick={() => void importSelected()}>
                Add selected ({selected.length})
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
                      {owned && <span className="text-[11px] text-muted-foreground">On list</span>}
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
