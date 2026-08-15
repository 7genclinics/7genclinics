"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  getClinicDoctors,
  getTodayClinicAppointments,
  checkInAppointment,
  updateClinicStatus,
  reassignClinicDoctor,
} from "@/lib/clinic/api";
import {
  clinicStatusClass,
  clinicStatusLabel,
  type ClinicAppointment,
  type ClinicDoctorOption,
} from "@/lib/clinic/types";
import { useClinicQueueRealtime } from "@/lib/realtime/useClinicQueueRealtime";
import { formatTime } from "@/lib/doctor/mappers";
import { getErrorMessage } from "@/lib/errors";
import { Loader2 } from "lucide-react";

const COLUMNS: { key: ClinicAppointment["status"][]; title: string }[] = [
  { key: ["scheduled", "checked_in"], title: "Arriving" },
  { key: ["waiting"], title: "Waiting" },
  { key: ["with_doctor"], title: "With doctor" },
  { key: ["payment_pending"], title: "Payment" },
  { key: ["completed"], title: "Done" },
];

export default function ReceptionQueuePage() {
  const [doctors, setDoctors] = useState<ClinicDoctorOption[]>([]);
  const [doctorId, setDoctorId] = useState<string>("");
  const [appointments, setAppointments] = useState<ClinicAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reassignTo, setReassignTo] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const [docs, rows] = await Promise.all([
        getClinicDoctors(),
        getTodayClinicAppointments(doctorId || undefined),
      ]);
      setDoctors(docs);
      setAppointments(rows);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load queue"));
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    void load();
  }, [load]);

  useClinicQueueRealtime({ onChange: load, doctorId: doctorId || undefined });

  const grouped = useMemo(() => {
    return COLUMNS.map((col) => ({
      ...col,
      items: appointments.filter((a) => col.key.includes(a.status)),
    }));
  }, [appointments]);

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Live queue</h2>
          <p className="text-sm text-muted-foreground">
            Tokens update as doctors call the next patient.
          </p>
        </div>
        <select
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
        >
          <option value="">All doctors</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.full_name} — {d.specialization}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : doctors.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No approved doctors yet. Approve a doctor in Admin before running the clinic floor.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-5 md:grid-cols-2">
          {grouped.map((col) => (
            <Card key={col.title} className="min-h-[280px]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  {col.title}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{col.items.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {col.items.length === 0 && <p className="text-xs text-muted-foreground">None</p>}
                {col.items.map((apt) => (
                  <div key={apt.id} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{apt.token_number ?? "—"}</p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] ${clinicStatusClass(apt.status)}`}
                      >
                        {clinicStatusLabel(apt.status)}
                      </span>
                    </div>
                    <p className="text-sm">{apt.patient?.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {apt.doctor?.profile?.full_name} · {formatTime(apt.scheduled_at)}
                    </p>

                    {(apt.status === "scheduled" || apt.status === "checked_in") && (
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={busyId === apt.id}
                        onClick={() => void run(apt.id, () => checkInAppointment(apt.id))}
                      >
                        Check in
                      </Button>
                    )}

                    {(apt.status === "scheduled" ||
                      apt.status === "checked_in" ||
                      apt.status === "waiting") && (
                      <>
                        <select
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                          value={reassignTo[apt.id] ?? ""}
                          onChange={(e) =>
                            setReassignTo((m) => ({ ...m, [apt.id]: e.target.value }))
                          }
                        >
                          <option value="">Reassign doctor…</option>
                          {doctors
                            .filter((d) => d.id !== apt.doctor_id)
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.full_name}
                              </option>
                            ))}
                        </select>
                        {reassignTo[apt.id] ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            disabled={busyId === apt.id}
                            onClick={() =>
                              void run(apt.id, () =>
                                reassignClinicDoctor(apt.id, reassignTo[apt.id])
                              )
                            }
                          >
                            Confirm reassign
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          disabled={busyId === apt.id}
                          onClick={() =>
                            void run(apt.id, () =>
                              updateClinicStatus(
                                apt.id,
                                apt.status === "waiting" ? "no_show" : "cancelled",
                                apt.status === "waiting" ? "Left queue" : "Cancelled at desk"
                              )
                            )
                          }
                        >
                          {apt.status === "waiting" ? "Mark no-show" : "Cancel"}
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
