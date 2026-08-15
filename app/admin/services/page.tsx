"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { getClinicServices, upsertClinicService } from "@/lib/clinic/api";
import type { ClinicService } from "@/lib/clinic/types";
import { getErrorMessage } from "@/lib/errors";
import { Loader2 } from "lucide-react";

export default function AdminServicesPage() {
  const [services, setServices] = useState<ClinicService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fee, setFee] = useState("2000");
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setServices(await getClinicServices(true));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load services"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setFee("2000");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await upsertClinicService({
        id: editingId ?? undefined,
        name,
        description,
        default_fee: Number(fee) || 0,
        is_active: true,
      });
      resetForm();
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save service"));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (service: ClinicService) => {
    try {
      await upsertClinicService({ ...service, is_active: !service.is_active });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Clinic services</h2>
        <p className="text-sm text-muted-foreground">Fees used for walk-ins and desk invoices. Online booking fees still come from the doctor profile.</p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{editingId ? "Edit service" : "Add service"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Default fee (PKR)</Label>
              <Input type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
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
              {services.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      PKR {s.default_fee} · {s.is_active ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditingId(s.id);
                      setName(s.name);
                      setDescription(s.description ?? "");
                      setFee(String(s.default_fee));
                    }}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => void toggleActive(s)}>
                      {s.is_active ? "Deactivate" : "Activate"}
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
