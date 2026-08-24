"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { getErrorMessage } from "@/lib/errors";
import type { ClinicStaffMember } from "@/lib/doctor/staff-server";
import {
  createDoctorClinicStaffAccount,
  getDoctorClinicStaff,
  setDoctorClinicStaffAccountActive,
} from "@/lib/doctor/staff-client";
import { Ban, CheckCircle, Loader2, Mail, Plus, RefreshCw, Users } from "lucide-react";

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
    setShowForm(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await createDoctorClinicStaffAccount({
        fullName,
        email,
        phone: phone || undefined,
        password: password || undefined,
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
                <div
                  key={member.id}
                  className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-900">{member.full_name}</p>
                    <p className="text-sm text-slate-600">{member.email}</p>
                    {member.phone && <p className="text-xs text-slate-500">{member.phone}</p>}
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
