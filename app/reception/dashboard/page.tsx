"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  getTodayClinicAppointments,
  searchClinicAppointments,
  checkInAppointment,
} from "@/lib/clinic/api";
import { clinicStatusClass, clinicStatusLabel, type ClinicAppointment } from "@/lib/clinic/types";
import { useClinicQueueRealtime } from "@/lib/realtime/useClinicQueueRealtime";
import { formatTime } from "@/lib/doctor/mappers";
import { getErrorMessage } from "@/lib/errors";
import { Loader2, RefreshCw, Search, Ticket, Users, Wallet, UserPlus } from "lucide-react";

export default function ReceptionDashboardPage() {
  const [appointments, setAppointments] = useState<ClinicAppointment[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tokenNotice, setTokenNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = query.trim()
        ? await searchClinicAppointments(query)
        : await getTodayClinicAppointments();
      setAppointments(rows);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load today's appointments"));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  useClinicQueueRealtime({ onChange: load });

  const stats = useMemo(() => {
    const inPerson = appointments;
    return {
      scheduled: inPerson.filter((a) => a.status === "scheduled").length,
      waiting: inPerson.filter((a) => a.status === "waiting" || a.status === "checked_in").length,
      withDoctor: inPerson.filter((a) => a.status === "with_doctor").length,
      payment: inPerson.filter((a) => a.status === "payment_pending").length,
    };
  }, [appointments]);

  const handleCheckIn = async (id: string) => {
    setBusyId(id);
    setError(null);
    setTokenNotice(null);
    try {
      const result = await checkInAppointment(id);
      setTokenNotice(`Checked in — token ${result.token_number}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Check-in failed"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Today at the desk</h2>
          <p className="text-sm text-muted-foreground">Search, check in, and send patients to the queue.</p>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Arriving / scheduled", value: stats.scheduled, icon: Users },
          { label: "Waiting", value: stats.waiting, icon: Ticket },
          { label: "With doctor", value: stats.withDoctor, icon: Users },
          { label: "Payment pending", value: stats.payment, icon: Wallet },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-3xl font-semibold">{item.value}</p>
              <item.icon className="h-5 w-5 text-brand-500" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, phone, token, or patient code"
          className="pl-10"
        />
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
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3">Token</th>
                  <th className="py-2 pr-3">Patient</th>
                  <th className="py-2 pr-3">Doctor</th>
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((apt) => (
                  <tr key={apt.id} className="border-b last:border-0">
                    <td className="py-3 pr-3 font-semibold">{apt.token_number ?? "—"}</td>
                    <td className="py-3 pr-3">
                      <Link href={`/reception/patients/${apt.patient_id}`} className="font-medium hover:underline">
                        {apt.patient?.full_name ?? "Patient"}
                      </Link>
                      <div className="text-xs text-muted-foreground">{apt.patient?.phone ?? apt.patient?.patient_code}</div>
                    </td>
                    <td className="py-3 pr-3">{apt.doctor?.profile?.full_name ?? "—"}</td>
                    <td className="py-3 pr-3">{formatTime(apt.scheduled_at)}</td>
                    <td className="py-3 pr-3 capitalize">
                      {(apt.booking_source ?? "online").replace("_", "-")}
                    </td>
                    <td className="py-3 pr-3">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${clinicStatusClass(apt.status)}`}>
                        {clinicStatusLabel(apt.status)}
                      </span>
                    </td>
                    <td className="py-3">
                      {apt.status === "scheduled" || apt.status === "checked_in" ? (
                        <Button
                          size="sm"
                          disabled={busyId === apt.id}
                          onClick={() => void handleCheckIn(apt.id)}
                        >
                          {busyId === apt.id ? "Checking in…" : "Check in"}
                        </Button>
                      ) : apt.status === "payment_pending" ? (
                        <Link href="/reception/billing">
                          <Button size="sm" variant="outline">Collect</Button>
                        </Link>
                      ) : (
                        <Link href="/reception/queue">
                          <Button size="sm" variant="ghost">Queue</Button>
                        </Link>
                      )}
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
