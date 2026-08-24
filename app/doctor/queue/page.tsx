"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useDoctor } from "@/contexts/DoctorContext";
import { callNextPatient, getTodayClinicAppointments, openConsultation } from "@/lib/clinic/api";
import { type ClinicAppointment } from "@/lib/clinic/types";
import { useClinicQueueRealtime } from "@/lib/realtime/useClinicQueueRealtime";
import { formatTime } from "@/lib/doctor/mappers";
import { getErrorMessage } from "@/lib/errors";
import { Loader2, Ticket, Users, CheckCircle2 } from "lucide-react";

export default function DoctorQueuePage() {
  const router = useRouter();
  const { doctorProfile, profile } = useDoctor();
  const [appointments, setAppointments] = useState<ClinicAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await getTodayClinicAppointments(doctorProfile.id);
      setAppointments(rows);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load queue"));
    } finally {
      setLoading(false);
    }
  }, [doctorProfile.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useClinicQueueRealtime({ onChange: load, doctorId: doctorProfile.id });

  const waiting = useMemo(() => appointments.filter((a) => a.status === "waiting"), [appointments]);
  const current = useMemo(() => appointments.find((a) => a.status === "with_doctor"), [appointments]);
  const completed = useMemo(
    () => appointments.filter((a) => a.status === "completed" || a.status === "payment_pending"),
    [appointments]
  );
  const remaining = useMemo(
    () =>
      appointments.filter((a) =>
        ["scheduled", "checked_in", "waiting", "with_doctor"].includes(a.status)
      ).length,
    [appointments]
  );

  const callNext = async () => {
    setBusy(true);
    setError(null);
    try {
      const id = await callNextPatient(doctorProfile.id);
      router.push(`/doctor/consultations/${id}`);
    } catch (err) {
      setError(getErrorMessage(err, "No waiting patients"));
    } finally {
      setBusy(false);
    }
  };

  const openExisting = async (id: string) => {
    setBusy(true);
    try {
      await openConsultation(id);
      router.push(`/doctor/consultations/${id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Good day, {profile.full_name}</h2>
          <p className="text-sm text-muted-foreground">
            In-clinic queue for today. Video and chat stay on Appointments.
          </p>
        </div>
        <Button
          onClick={() => void callNext()}
          disabled={busy || waiting.length === 0}
          className="bg-brand-500 text-white hover:bg-brand-600"
        >
          {busy ? "Calling…" : "Call next"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Today's patients", value: appointments.length, icon: Users },
          { label: "Waiting", value: waiting.length, icon: Ticket },
          { label: "Completed / billed", value: completed.length, icon: CheckCircle2 },
          { label: "Remaining", value: remaining, icon: Users },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-3xl font-semibold">{stat.value}</p>
              <stat.icon className="h-5 w-5 text-brand-500" />
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {current && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">With you now</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="font-semibold">
                {current.token_number} · {current.patient?.full_name}
              </p>
              <p className="text-xs text-muted-foreground">{current.patient?.phone}</p>
            </div>
            <div className="flex gap-2">
              {current.patient_id && (
                <Link href={`/doctor/patients/${current.patient_id}`}>
                  <Button variant="outline">Details</Button>
                </Link>
              )}
              <Button onClick={() => void openExisting(current.id)}>Continue consult</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Waiting ({waiting.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            </div>
          ) : waiting.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No patients waiting.</p>
          ) : (
            <ul className="space-y-2">
              {waiting.map((apt) => (
                <li
                  key={apt.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <div>
                    <p className="font-medium">
                      {apt.token_number} · {apt.patient?.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(apt.scheduled_at)} ·{" "}
                      {(apt.booking_source ?? "online").replace("_", "-")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {apt.patient_id && (
                      <Link href={`/doctor/patients/${apt.patient_id}`}>
                        <Button size="sm" variant="ghost">
                          Details
                        </Button>
                      </Link>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void openExisting(apt.id)}
                    >
                      Open
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Video and chat sessions remain on{" "}
        <Link href="/doctor/appointments" className="text-brand-600 hover:underline">
          Appointments
        </Link>
        .
      </p>
    </div>
  );
}
