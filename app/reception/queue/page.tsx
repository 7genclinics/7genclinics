"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  getClinicDoctors,
  getTodayClinicAppointments,
  checkInAppointment,
  collectDeskPayment,
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
import { formatCurrency, formatTime } from "@/lib/doctor/mappers";
import { getErrorMessage } from "@/lib/errors";
import { ClipboardList, Loader2, Stethoscope, Ticket, UserRound, Wallet } from "lucide-react";

const STAGES: {
  id: string;
  title: string;
  key: ClinicAppointment["status"][];
  icon: typeof Ticket;
}[] = [
  { id: "arriving", title: "Arriving", key: ["scheduled", "checked_in"], icon: UserRound },
  { id: "payment", title: "Payment", key: ["payment_pending"], icon: Wallet },
  { id: "waiting", title: "Waiting", key: ["waiting"], icon: Ticket },
  { id: "with_doctor", title: "With doctor", key: ["with_doctor"], icon: Stethoscope },
  { id: "done", title: "Done", key: ["completed"], icon: ClipboardList },
];

export default function ReceptionQueuePage() {
  const [doctors, setDoctors] = useState<ClinicDoctorOption[]>([]);
  const [doctorId, setDoctorId] = useState<string>("");
  const [appointments, setAppointments] = useState<ClinicAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reassignTo, setReassignTo] = useState<Record<string, string>>({});
  const [stageId, setStageId] = useState("arriving");

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

  const stages = useMemo(
    () =>
      STAGES.map((stage) => ({
        ...stage,
        items: appointments.filter((a) => stage.key.includes(a.status)),
      })),
    [appointments],
  );

  const activeStage = stages.find((s) => s.id === stageId) ?? stages[0];

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
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Live queue</h2>
          <p className="text-sm text-muted-foreground">
            Collect the fee when the patient arrives, then they wait for the doctor.
          </p>
        </div>
        <select
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm sm:w-72"
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
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
            {stages.map((stage) => {
              const Icon = stage.icon;
              const selected = stage.id === activeStage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setStageId(stage.id)}
                  className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                    selected
                      ? "border-brand-400 bg-brand-50 shadow-sm"
                      : "border-border bg-card hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{stage.title}</span>
                    <Icon className={`h-4 w-4 ${selected ? "text-brand-600" : "text-muted-foreground"}`} />
                  </div>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{stage.items.length}</p>
                </button>
              );
            })}
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <p className="font-semibold">{activeStage.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeStage.items.length} patient{activeStage.items.length === 1 ? "" : "s"} in this stage
                  </p>
                </div>
              </div>

              {activeStage.items.length === 0 ? (
                <p className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No patients in {activeStage.title.toLowerCase()} right now.
                </p>
              ) : (
                <ul className="divide-y">
                  {activeStage.items.map((apt) => (
                    <li key={apt.id} className="px-4 py-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-12 w-14 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">
                            {apt.token_number ?? "—"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-medium">{apt.patient?.full_name ?? "Patient"}</p>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[11px] ${clinicStatusClass(apt.status)}`}
                              >
                                {clinicStatusLabel(apt.status)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {apt.doctor?.profile?.full_name} · {formatTime(apt.scheduled_at)}
                            </p>
                            {apt.patient_id && (
                              <Link
                                href={`/reception/patients/${apt.patient_id}?visit=${apt.id}`}
                                className="mt-1 inline-block text-xs font-medium text-brand-600 hover:underline"
                              >
                                Record vitals / history
                              </Link>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
                          {(apt.status === "scheduled" || apt.status === "checked_in") && (
                            <Button
                              size="sm"
                              disabled={busyId === apt.id}
                              onClick={() => void run(apt.id, () => checkInAppointment(apt.id))}
                            >
                              Check in
                            </Button>
                          )}

                          {apt.status === "payment_pending" && (
                            <>
                              <Button
                                size="sm"
                                disabled={busyId === apt.id}
                                onClick={() =>
                                  void run(apt.id, () =>
                                    collectDeskPayment({
                                      appointmentId: apt.id,
                                      method: "cash",
                                    }),
                                  )
                                }
                              >
                                Collect {formatCurrency(Number(apt.invoice?.total ?? apt.consultation_fee))} cash
                              </Button>
                              <Link href="/reception/billing">
                                <Button size="sm" variant="outline">
                                  Card / discount
                                </Button>
                              </Link>
                            </>
                          )}

                          {(apt.status === "scheduled" ||
                            apt.status === "checked_in" ||
                            apt.status === "waiting" ||
                            apt.status === "payment_pending") && (
                            <>
                              {(() => {
                                const others = doctors.filter(
                                  (d) =>
                                    d.id !== apt.doctor_id &&
                                    (!apt.organization_id || d.organization_id === apt.organization_id),
                                );
                                if (others.length === 0) {
                                  return (
                                    <p className="text-xs text-muted-foreground">
                                      No other doctor in this clinic
                                    </p>
                                  );
                                }
                                return (
                                  <>
                                    <select
                                      className="h-9 min-w-[10rem] rounded-md border border-input bg-background px-2 text-xs"
                                      value={reassignTo[apt.id] ?? ""}
                                      onChange={(e) =>
                                        setReassignTo((m) => ({ ...m, [apt.id]: e.target.value }))
                                      }
                                    >
                                      <option value="">Reassign doctor…</option>
                                      {others.map((d) => (
                                        <option key={d.id} value={d.id}>
                                          {d.full_name}
                                        </option>
                                      ))}
                                    </select>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={busyId === apt.id || !reassignTo[apt.id]}
                                      onClick={() =>
                                        void run(apt.id, async () => {
                                          await reassignClinicDoctor(apt.id, reassignTo[apt.id]);
                                          setReassignTo((m) => {
                                            const next = { ...m };
                                            delete next[apt.id];
                                            return next;
                                          });
                                        })
                                      }
                                    >
                                      Confirm reassign
                                    </Button>
                                  </>
                                );
                              })()}
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busyId === apt.id}
                                onClick={() =>
                                  void run(apt.id, () =>
                                    updateClinicStatus(
                                      apt.id,
                                      apt.status === "waiting" || apt.status === "payment_pending"
                                        ? "no_show"
                                        : "cancelled",
                                      apt.status === "waiting" || apt.status === "payment_pending"
                                        ? "Left queue"
                                        : "Cancelled at desk",
                                    ),
                                  )
                                }
                              >
                                {apt.status === "waiting" || apt.status === "payment_pending"
                                  ? "Mark no-show"
                                  : "Cancel"}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
