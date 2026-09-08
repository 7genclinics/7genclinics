"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  getClinicDoctors,
  getTodayClinicAppointments,
  searchClinicAppointments,
  checkInAppointment,
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
import {
  Banknote,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RefreshCw,
  Search,
  Stethoscope,
  UserPlus,
  Users,
} from "lucide-react";

export default function ReceptionDashboardPage() {
  const [todayAppointments, setTodayAppointments] = useState<ClinicAppointment[]>([]);
  const [appointments, setAppointments] = useState<ClinicAppointment[]>([]);
  const [doctors, setDoctors] = useState<ClinicDoctorOption[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tokenNotice, setTokenNotice] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [docs, today] = await Promise.all([
        getClinicDoctors(),
        getTodayClinicAppointments(doctorId || undefined),
      ]);
      setDoctors(docs);
      setTodayAppointments(today);
      if (debouncedQuery.trim()) {
        const searched = await searchClinicAppointments(debouncedQuery);
        setAppointments(
          doctorId ? searched.filter((row) => row.doctor_id === doctorId) : searched,
        );
      } else {
        setAppointments(today);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load today's appointments"));
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, doctorId]);

  useEffect(() => {
    void load();
  }, [load]);

  useClinicQueueRealtime({ onChange: load, doctorId: doctorId || undefined });

  const stats = useMemo(() => {
    const open = todayAppointments.filter(
      (a) => !["cancelled", "no_show", "expired_no_show"].includes(a.status),
    );
    const deskNeeded = todayAppointments.filter((a) =>
      ["scheduled", "checked_in", "payment_pending"].includes(a.status),
    ).length;
    const onFloor = todayAppointments.filter((a) =>
      ["waiting", "with_doctor"].includes(a.status),
    );
    const completed = todayAppointments.filter((a) => a.status === "completed").length;
    const walkIns = todayAppointments.filter((a) => a.booking_source === "walk_in").length;
    const collected = todayAppointments.reduce((sum, a) => {
      if (a.invoice?.status === "paid") return sum + Number(a.invoice.total ?? 0);
      if (a.payment?.status === "completed") return sum + Number(a.payment.amount ?? 0);
      return sum;
    }, 0);
    const doctorsOnFloor = new Set(onFloor.map((a) => a.doctor_id)).size;

    return {
      visits: open.length,
      deskNeeded,
      onFloor: onFloor.length,
      doctorsOnFloor,
      completed,
      walkIns,
      collected,
    };
  }, [todayAppointments]);

  const sendToQueue = async (id: string) => {
    setBusyId(id);
    setError(null);
    setTokenNotice(null);
    try {
      const result = await checkInAppointment(id);
      setTokenNotice(
        result.status === "waiting"
          ? `Token ${result.token_number} — waiting for the doctor`
          : `Token ${result.token_number} — collect the fee, then they wait`,
      );
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not add to queue"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Today at the desk</h2>
          <p className="text-sm text-muted-foreground">
            Check in at the desk, collect the consultation fee, then send them to wait for the doctor.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Link href="/reception/walk-in">
            <Button className="bg-brand-500 hover:bg-brand-600 text-white">
              <UserPlus className="mr-2 h-4 w-4" />
              Walk-in
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            label: "Today's visits",
            value: String(stats.visits),
            hint: "Booked and walk-in, still active",
            icon: ClipboardList,
            href: undefined as string | undefined,
          },
          {
            label: "Need desk",
            value: String(stats.deskNeeded),
            hint: "Check-in or collect fee",
            icon: Users,
            href: "/reception/queue",
          },
          {
            label: "On the floor",
            value: String(stats.onFloor),
            hint:
              stats.doctorsOnFloor > 0
                ? `${stats.doctorsOnFloor} doctor${stats.doctorsOnFloor === 1 ? "" : "s"} seeing patients`
                : "Waiting or with a doctor",
            icon: Stethoscope,
            href: "/reception/queue",
          },
          {
            label: "Completed today",
            value: String(stats.completed),
            hint: "Visits closed at the desk",
            icon: CheckCircle2,
            href: undefined,
          },
          {
            label: "Walk-ins",
            value: String(stats.walkIns),
            hint: "Registered at reception today",
            icon: UserPlus,
            href: "/reception/walk-in",
          },
          {
            label: "Collected today",
            value: formatCurrency(stats.collected),
            hint: "Desk and prepaid fees received",
            icon: Banknote,
            href: "/reception/billing",
          },
        ].map((item) => {
          const Icon = item.icon;
          const inner = (
            <Card className={item.href ? "transition-colors hover:border-brand-300 hover:bg-brand-50/40" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold tabular-nums sm:text-3xl">{item.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
                </div>
                <Icon className="h-5 w-5 shrink-0 text-brand-500" />
              </CardContent>
            </Card>
          );
          return item.href ? (
            <Link key={item.label} href={item.href}>
              {inner}
            </Link>
          ) : (
            <div key={item.label}>{inner}</div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, token, or patient code"
            className="pl-10"
          />
        </div>
        <select
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm sm:w-64"
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
        >
          <option value="">All doctors</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.full_name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {tokenNotice && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          {tokenNotice}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">In-person appointments</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            </div>
          ) : appointments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No in-person visits for today yet.</p>
          ) : (
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3">Token</th>
                  <th className="py-2 pr-3">Patient</th>
                  <th className="py-2 pr-3">Doctor</th>
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((apt) => (
                  <tr key={apt.id} className="border-b last:border-0">
                    <td className="py-3 pr-3 font-semibold">{apt.token_number ?? "—"}</td>
                    <td className="py-3 pr-3">
                      <Link
                        href={`/reception/patients/${apt.patient_id}?visit=${apt.id}`}
                        className="font-medium hover:underline"
                      >
                        {apt.patient?.full_name ?? "Patient"}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {apt.patient?.phone ?? apt.patient?.patient_code}
                      </div>
                    </td>
                    <td className="py-3 pr-3">{apt.doctor?.profile?.full_name ?? "—"}</td>
                    <td className="py-3 pr-3">{formatTime(apt.scheduled_at)}</td>
                    <td className="py-3 pr-3 capitalize">
                      {(apt.booking_source ?? "online").replace("_", "-")}
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${clinicStatusClass(apt.status)}`}
                      >
                        {clinicStatusLabel(apt.status)}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        {apt.patient_id && (
                          <Link href={`/reception/patients/${apt.patient_id}?visit=${apt.id}`}>
                            <Button size="sm" variant="outline">
                              Vitals
                            </Button>
                          </Link>
                        )}
                        {(apt.status === "scheduled" || apt.status === "checked_in") && (
                          <Button
                            size="sm"
                            disabled={busyId === apt.id}
                            onClick={() => void sendToQueue(apt.id)}
                          >
                            {busyId === apt.id ? "Checking in…" : "Check in"}
                          </Button>
                        )}
                        {apt.status === "payment_pending" && (
                          <Link href="/reception/billing">
                            <Button size="sm" variant="outline">
                              Collect
                            </Button>
                          </Link>
                        )}
                        {apt.status === "waiting" && (
                          <Link href="/reception/queue">
                            <Button size="sm" variant="ghost">
                              Queue
                            </Button>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
