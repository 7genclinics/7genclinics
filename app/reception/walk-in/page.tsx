"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  createWalkIn,
  getClinicAppointment,
  getClinicDoctors,
  getClinicServices,
  searchPatients,
} from "@/lib/clinic/api";
import type { ClinicDoctorOption, ClinicService } from "@/lib/clinic/types";
import type { Gender, Profile } from "@/types";
import { getErrorMessage } from "@/lib/errors";

export default function WalkInPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<ClinicDoctorOption[]>([]);
  const [services, setServices] = useState<ClinicService[]>([]);
  const [phoneSearch, setPhoneSearch] = useState("");
  const [matches, setMatches] = useState<Profile[]>([]);
  const [existingId, setExistingId] = useState<string | undefined>();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [city, setCity] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([getClinicDoctors(), getClinicServices()])
      .then(([d, s]) => {
        setDoctors(d);
        setServices(s);
        if (d[0]) setDoctorId(d[0].id);
        if (s[0]) setServiceId(s[0].id);
      })
      .catch((err) => setError(getErrorMessage(err, "Failed to load doctors/services")));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (phoneSearch.trim().length < 3) {
        setMatches([]);
        return;
      }
      void searchPatients(phoneSearch).then(setMatches).catch(() => setMatches([]));
    }, 250);
    return () => clearTimeout(t);
  }, [phoneSearch]);

  const pickPatient = (p: Profile) => {
    setExistingId(p.id);
    setFullName(p.full_name);
    setPhone(p.phone ?? "");
    setEmail(p.email?.endsWith("@clinic.local") ? "" : p.email);
    setGender(p.gender ?? "");
    setCity(p.city ?? "");
    setMatches([]);
    setPhoneSearch(p.phone ?? p.full_name);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId) {
      setError("Add and approve at least one doctor before registering walk-ins.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const aptId = await createWalkIn({
        existingPatientId: existingId,
        fullName,
        phone,
        email: email || undefined,
        gender: gender || null,
        city: city || null,
        doctorId,
        serviceId: serviceId || null,
        notes,
      });
      const apt = await getClinicAppointment(aptId);
      router.push(
        apt?.patient_id
          ? `/reception/patients/${apt.patient_id}?visit=${aptId}`
          : "/reception/queue"
      );
    } catch (err) {
      setError(getErrorMessage(err, "Could not register walk-in"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Register walk-in</h2>
        <p className="text-sm text-muted-foreground">
          Search an existing patient by phone or name, or create a new record. You will record
          vitals next, then add them to the doctor&apos;s queue.
        </p>
      </div>

      {doctors.length === 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No approved doctors yet. Approve a doctor in Admin → Manage Doctors before walk-ins can join the
          queue.
        </p>
      )}

      {services.length === 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No clinic services configured. Add fees in Admin → Services (doctor consultation fee is used as
          fallback).
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Patient</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Find existing patient</Label>
              <Input
                value={phoneSearch}
                onChange={(e) => {
                  setPhoneSearch(e.target.value);
                  setExistingId(undefined);
                }}
                placeholder="Phone, name, or patient code"
              />
              {matches.length > 0 && (
                <div className="rounded-lg border bg-background">
                  {matches.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => pickPatient(p)}
                    >
                      <span className="font-medium">{p.full_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.patient_code} · {p.phone ?? "no phone"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {existingId && (
                <p className="text-xs text-emerald-700">Using existing patient record.</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <select
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender | "")}
                >
                  <option value="">Not specified</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Doctor</Label>
                <select
                  required
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  disabled={doctors.length === 0}
                >
                  {doctors.length === 0 ? (
                    <option value="">No approved doctors</option>
                  ) : (
                    doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name} — {d.specialization}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Service</Label>
                <select
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                >
                  {services.length === 0 ? (
                    <option value="">Use doctor fee</option>
                  ) : (
                    services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (PKR {s.default_fee})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                className="min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={saving || doctors.length === 0}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white"
            >
              {saving ? "Adding to queue…" : "Add to waiting queue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
