"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { getErrorMessage } from "@/lib/errors";
import type { ClinicStaffMember } from "@/lib/doctor/staff-server";
import {
  FULL_RECEPTION_PERMISSIONS,
  NO_RECEPTION_MODULES,
  RECEPTION_ACCESS_KEYS,
  RECEPTION_ACCESS_LABELS,
  hasAnyReceptionModule,
  receptionAccessSummary,
  type ReceptionPermissions,
} from "@/lib/doctor/reception-permissions";
import {
  createDoctorClinicStaffAccount,
  getDoctorClinicStaff,
  setDoctorClinicStaffAccountActive,
  setDoctorClinicStaffAccountPermissions,
} from "@/lib/doctor/staff-client";
import { Ban, CheckCircle, Loader2, Mail, Plus, RefreshCw, Shield, Users } from "lucide-react";

function ReceptionAccessPicker({
  value,
  onChange,
}: {
  value: ReceptionPermissions;
  onChange: (next: ReceptionPermissions) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Clinic access</Label>
        <p className="mt-1 text-xs text-slate-500">
          Choose whether this person can open every reception page, or only the areas you pick.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange(FULL_RECEPTION_PERMISSIONS)}
          className={`rounded-lg border p-3 text-left transition-colors ${
            value.access === "full"
              ? "border-brand-400 bg-brand-50 ring-1 ring-brand-300"
              : "border-slate-200 bg-white hover:border-brand-200"
          }`}
        >
          <p className="text-sm font-medium text-slate-900">Whole access</p>
          <p className="mt-1 text-xs text-slate-500">
            Dashboard, queue, walk-in, patients, billing, medicines, and subscription.
          </p>
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({
              access: "specific",
              modules: value.access === "specific" ? value.modules : { ...NO_RECEPTION_MODULES, dashboard: true, queue: true },
            })
          }
          className={`rounded-lg border p-3 text-left transition-colors ${
            value.access === "specific"
              ? "border-brand-400 bg-brand-50 ring-1 ring-brand-300"
              : "border-slate-200 bg-white hover:border-brand-200"
          }`}
        >
          <p className="text-sm font-medium text-slate-900">Specific access</p>
          <p className="mt-1 text-xs text-slate-500">Pick only the reception pages this person should use.</p>
        </button>
      </div>
      {value.access === "specific" && (
        <div className="grid gap-2 sm:grid-cols-2">
          {RECEPTION_ACCESS_KEYS.map((key) => {
            const enabled = value.modules[key];
            return (
              <label
                key={key}
                className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition-colors ${
                  enabled ? "border-brand-200 bg-brand-50/50" : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) =>
                    onChange({
                      access: "specific",
                      modules: { ...value.modules, [key]: e.target.checked },
                    })
                  }
                  className="mt-0.5 h-4 w-4 accent-brand-500"
                />
                <span className="text-sm text-slate-800">{RECEPTION_ACCESS_LABELS[key]}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DoctorStaffPage() {
  const [staff, setStaff] = useState<ClinicStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState<ReceptionPermissions>(FULL_RECEPTION_PERMISSIONS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<ReceptionPermissions>(FULL_RECEPTION_PERMISSIONS);

  const load = useCallback(async () => {
    setError(null);
    try {
      setStaff(await getDoctorClinicStaff());
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load staff"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setPermissions(FULL_RECEPTION_PERMISSIONS);
    setShowForm(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (permissions.access === "specific" && !hasAnyReceptionModule(permissions)) {
      setError("Choose at least one area for specific access.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await createDoctorClinicStaffAccount({
        fullName,
        email,
        phone: phone || undefined,
        password: password || undefined,
        permissions,
      });
      if (result.emailSent) {
        setMessage(`Account created. Login details were sent to ${email.trim().toLowerCase()}.`);
      } else {
        setMessage(
          `Account created, but the email could not be sent${
            result.temporaryPassword ? `. Temporary password: ${result.temporaryPassword}` : "."
          }`
        );
      }
      resetForm();
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create staff account"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (member: ClinicStaffMember, isActive: boolean) => {
    setActionId(member.id);
    setError(null);
    try {
      await setDoctorClinicStaffAccountActive(member.id, isActive);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update staff account"));
    } finally {
      setActionId(null);
    }
  };

  const handleSaveAccess = async (member: ClinicStaffMember) => {
    if (editPermissions.access === "specific" && !hasAnyReceptionModule(editPermissions)) {
      setError("Choose at least one area for specific access.");
      return;
    }
    setActionId(member.id);
    setError(null);
    try {
      await setDoctorClinicStaffAccountPermissions(member.id, editPermissions);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update staff access"));
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reception & staff</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create a front-desk login. Credentials are emailed to the address you enter.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add reception staff
          </Button>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      {showForm && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="staff-name">Full name</Label>
                  <Input
                    id="staff-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="staff-email">Email (login will be sent here)</Label>
                  <Input
                    id="staff-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="staff-phone">Phone (optional)</Label>
                  <Input
                    id="staff-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="staff-password">Password (optional)</Label>
                  <Input
                    id="staff-password"
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    placeholder="Leave blank to generate one"
                    className="mt-1.5"
                  />
                </div>
              </div>
              <ReceptionAccessPicker value={permissions} onChange={setPermissions} />
              <p className="text-xs text-slate-500">
                They can sign in at Login → Reception with the email and password from this message.
              </p>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  Create & email login
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center text-slate-500">
              <Users className="h-8 w-8" />
              <p className="text-sm">No reception staff yet. Add someone to send them a login.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {staff.map((member) => (
                <div key={member.id} className="px-6 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{member.full_name}</p>
                      <p className="text-sm text-slate-600">{member.email}</p>
                      {member.phone && <p className="text-xs text-slate-500">{member.phone}</p>}
                      <p className="mt-1 text-xs text-slate-500">
                        {receptionAccessSummary(member.permissions ?? FULL_RECEPTION_PERMISSIONS)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          member.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {member.is_active ? "Active" : "Disabled"}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingId(editingId === member.id ? null : member.id);
                          setEditPermissions(member.permissions ?? FULL_RECEPTION_PERMISSIONS);
                        }}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Access
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actionId === member.id}
                        onClick={() => void handleToggle(member, !member.is_active)}
                      >
                        {actionId === member.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : member.is_active ? (
                          <Ban className="mr-2 h-4 w-4" />
                        ) : (
                          <CheckCircle className="mr-2 h-4 w-4" />
                        )}
                        {member.is_active ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </div>
                  {editingId === member.id && (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <ReceptionAccessPicker value={editPermissions} onChange={setEditPermissions} />
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          disabled={actionId === member.id}
                          onClick={() => void handleSaveAccess(member)}
                        >
                          {actionId === member.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Save access
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
