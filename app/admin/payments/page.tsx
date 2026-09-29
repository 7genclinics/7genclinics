"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  DollarSign, Wallet, CheckCircle2, Clock, RefreshCw, Loader2, Search,
  Download, FileText, Filter, X, Check, Users, Undo2, ImageIcon,
  Paperclip, ExternalLink, Receipt,
} from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import {
  getAdminPayments,
  buildDoctorPayoutSummaries,
  buildPayoutTotals,
} from "@/lib/admin/api";
import { usePaymentsRealtime } from "@/lib/realtime/usePaymentsRealtime";
import { completeManualRefund } from "@/lib/refunds/process";
import { REFUND_STATUS_LABEL } from "@/lib/refunds/policy";
import type { AdminPayment } from "@/lib/admin/types";
import type { PaymentMethod, PaymentStatus, PayoutStatus, RefundStatus } from "@/types";
import { getErrorMessage } from "@/lib/errors";
import { matchesAnyFlexibleText } from "@/lib/search/flexible-match";

function formatPKR(value: number) {
  return `PKR ${Math.round(value).toLocaleString("en-PK")}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  jazzcash: "JazzCash",
  easypaisa: "EasyPaisa",
  stripe: "Card",
  bank_transfer: "Bank Transfer",
};

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pending",
  completed: "Collected",
  failed: "Failed",
  refunded: "Refunded",
};

function paymentStatusClass(status: PaymentStatus) {
  const map: Record<PaymentStatus, string> = {
    completed: "bg-emerald-100 text-emerald-800",
    pending: "bg-amber-100 text-amber-800",
    failed: "bg-red-100 text-red-800",
    refunded: "bg-slate-100 text-slate-700",
  };
  return map[status];
}

function payoutBadgeClass(status: PayoutStatus) {
  return status === "paid"
    ? "bg-emerald-100 text-emerald-800"
    : "bg-amber-100 text-amber-800";
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminPaymentsPage() {
  const { profile } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [toast, setToast] = useState("");

  const [view, setView] = useState<"doctors" | "transactions">("doctors");
  const [actionId, setActionId] = useState<string | null>(null);
  const [viewProofPayment, setViewProofPayment] = useState<AdminPayment | null>(null);
  const [viewPayoutReceiptUrl, setViewPayoutReceiptUrl] = useState<{ url: string; doctorName: string; reference: string } | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [payoutFilter, setPayoutFilter] = useState<"all" | PayoutStatus>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | PaymentStatus>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      setPayments(await getAdminPayments());
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load payments"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  usePaymentsRealtime({ onChange: loadData });

  const doctorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of payments) {
      if (p.doctor_id) map.set(p.doctor_id, p.doctor?.profile?.full_name ?? "Doctor");
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [payments]);

  const pendingApprovals = useMemo(
    () => payments.filter((p) => p.status === "pending" && p.proof_url),
    [payments]
  );

  const pendingRefunds = useMemo(
    () => payments.filter((p) => p.refund_status === "pending" || p.refund_status === "processing"),
    [payments]
  );

  const handleProcessRefund = async (paymentId: string) => {
    setActionId(paymentId);
    try {
      await completeManualRefund(paymentId, profile.id);
      showToast("Refund marked as processed. Patient has been notified.");
      await loadData();
    } catch (err) {
      showToast(getErrorMessage(err, "Refund processing failed"));
    } finally {
      setActionId(null);
    }
  };

  const filtered = useMemo(() => {
    const fromTs = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null;
    const toTs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;

    return payments.filter((p) => {
      if (doctorFilter !== "all" && p.doctor_id !== doctorFilter) return false;
      if (payoutFilter !== "all" && p.payout_status !== payoutFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      const created = new Date(p.created_at).getTime();
      if (fromTs && created < fromTs) return false;
      if (toTs && created > toTs) return false;
      if (
        search.trim() &&
        !matchesAnyFlexibleText(
          [
            p.transaction_id,
            p.patient?.full_name,
            p.doctor?.profile?.full_name,
            p.payout_reference,
          ],
          search,
        )
      ) {
        return false;
      }
      return true;
    });
  }, [payments, search, doctorFilter, payoutFilter, statusFilter, dateFrom, dateTo]);

  const totals = useMemo(() => buildPayoutTotals(filtered), [filtered]);
  const doctorSummaries = useMemo(() => buildDoctorPayoutSummaries(filtered), [filtered]);

  const hasActiveFilters =
    search || doctorFilter !== "all" || payoutFilter !== "all" || statusFilter !== "all" || dateFrom || dateTo;

  const resetFilters = () => {
    setSearch("");
    setDoctorFilter("all");
    setPayoutFilter("all");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const exportTransactions = () => {
    const rows = filtered.map((p) => ({
      "Txn ID": p.transaction_id ?? p.id.slice(0, 8),
      Date: formatDate(p.created_at),
      Patient: p.patient?.full_name ?? "Patient",
      Doctor: p.doctor?.profile?.full_name ?? "Doctor",
      Specialization: p.doctor?.specialization ?? "—",
      Method: METHOD_LABEL[p.payment_method as PaymentMethod] ?? p.payment_method,
      Amount: Number(p.amount),
      "Platform Fee": Number(p.platform_fee),
      "Doctor Earning": Number(p.doctor_earning),
      "Payment Status": PAYMENT_STATUS_LABEL[p.status as PaymentStatus] ?? p.status,
      "Payout Status": p.payout_status === "paid" ? "Paid" : "Pending",
      "Paid At": formatDate(p.paid_at),
      Reference: p.payout_reference ?? "",
    }));
    downloadCsv(`apna-clinic-transactions-${Date.now()}.csv`, rows);
    showToast(rows.length ? `Exported ${rows.length} transactions.` : "No transactions to export.");
  };

  const exportDoctorStatement = (doctorId: string, name: string) => {
    const rows = payments
      .filter((p) => p.doctor_id === doctorId && p.status === "completed")
      .map((p) => ({
        "Txn ID": p.transaction_id ?? p.id.slice(0, 8),
        Date: formatDate(p.created_at),
        Patient: p.patient?.full_name ?? "Patient",
        "Gross Fee": Number(p.amount),
        "Platform Fee (10%)": Number(p.platform_fee),
        "Net Earning": Number(p.doctor_earning),
        "Payout Status": p.payout_status === "paid" ? "Paid" : "Pending",
        "Paid At": formatDate(p.paid_at),
        Reference: p.payout_reference ?? "",
      }));
    downloadCsv(`statement-${name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.csv`, rows);
    showToast(rows.length ? `Exported statement for ${name}.` : "No records for this doctor.");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  const summaryCards = [
    {
      label: "Total Doctor Earnings",
      value: formatPKR(totals.totalEarned),
      sub: "Paid to doctors by patients",
      icon: Wallet,
      accent: "text-sky-500",
    },
    {
      label: "Received by doctors",
      value: formatPKR(totals.totalEarned),
      sub: "Confirmed patient payments",
      icon: CheckCircle2,
      accent: "text-emerald-600",
    },
    {
      label: "Proofs awaiting doctors",
      value: String(pendingApprovals.length),
      sub: "Doctors confirm these payments",
      icon: Clock,
      accent: "text-amber-500",
    },
    {
      label: "Commission Revenue",
      value: formatPKR(totals.commission),
      sub: `${formatPKR(totals.grossVolume)} gross volume`,
      icon: DollarSign,
      accent: "text-brand-500",
    },
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-in slide-in-from-right duration-200">
          <Check className="h-4 w-4 text-brand-300" />
          <span>{toast}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Doctor Payments</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review earnings, settle doctor payouts, and audit every transaction. Updates sync live to doctor dashboards.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportTransactions}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {pendingApprovals.length > 0 && (
        <Card className="border-violet-200 bg-violet-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-violet-900">
              <ImageIcon className="h-5 w-5" />
              Pending Payment Approvals ({pendingApprovals.length})
            </CardTitle>
            <CardDescription>
              Patient payment screenshots are reviewed by the assigned doctor from their Payments page.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 text-sm text-violet-900">
            Doctors approve or reject these proofs. Superadmin no longer confirms patient bookings from here.
          </CardContent>
        </Card>
      )}

      {pendingRefunds.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <Undo2 className="h-5 w-5" />
              Pending Refunds ({pendingRefunds.length})
            </CardTitle>
            <CardDescription>
              Cancelled appointments awaiting manual refund to the patient&apos;s payment method.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-amber-100/50 border-b border-amber-200 text-amber-900">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Patient</th>
                    <th className="px-6 py-3 font-semibold">Doctor</th>
                    <th className="px-6 py-3 font-semibold">Refund Amount</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold">Initiated</th>
                    <th className="px-6 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {pendingRefunds.map((p) => (
                    <tr key={p.id} className="hover:bg-amber-50/50">
                      <td className="px-6 py-4 font-medium">{p.patient?.full_name ?? "Patient"}</td>
                      <td className="px-6 py-4">{p.doctor?.profile?.full_name ?? "Doctor"}</td>
                      <td className="px-6 py-4 font-semibold text-amber-700">
                        {formatPKR(Number(p.refund_amount ?? p.amount))}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-amber-700">
                          {REFUND_STATUS_LABEL[p.refund_status as RefundStatus]}
                        </span>
                        {p.refund_note && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 max-w-xs truncate" title={p.refund_note}>
                            {p.refund_note}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {formatDate(p.refund_initiated_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                          disabled={actionId === p.id}
                          onClick={() => handleProcessRefund(p.id)}
                        >
                          {actionId === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5 mr-1" />
                          )}
                          Mark Refunded
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                  {c.label}
                  <Icon className={`h-4 w-4 ${c.accent}`} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-xs text-muted-foreground mt-2">{c.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search patient, doctor, txn or reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400"
              />
            </div>
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400"
            >
              <option value="all">All doctors</option>
              {doctorOptions.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select
              value={payoutFilter}
              onChange={(e) => setPayoutFilter(e.target.value as "all" | PayoutStatus)}
              className="h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400"
            >
              <option value="all">All payouts</option>
              <option value="pending">Pending settlement</option>
              <option value="paid">Paid / Cleared</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | PaymentStatus)}
              className="h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400"
            >
              <option value="all">All payments</option>
              <option value="completed">Collected</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
            </select>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 px-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 px-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400"
              />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
            <Filter className="h-3 w-3" />
            Showing {filtered.length} of {payments.length} transactions
          </p>
        </CardContent>
      </Card>

      {/* View toggle */}
      <div className="flex bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setView("doctors")}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
            view === "doctors" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-3.5 w-3.5" /> By Doctor
        </button>
        <button
          onClick={() => setView("transactions")}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
            view === "transactions" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-3.5 w-3.5" /> Transactions
        </button>
      </div>

      {/* By Doctor view */}
      {view === "doctors" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Doctor collections</CardTitle>
            <CardDescription>
              Patients pay doctors directly. This list is a record. Doctors confirm proofs from their own Payments page.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-6 py-4">Doctor</th>
                    <th className="px-6 py-4">Total Earned</th>
                    <th className="px-6 py-4">Paid</th>
                    <th className="px-6 py-4">Pending</th>
                    <th className="px-6 py-4">Last Paid</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {doctorSummaries.map((d) => (
                    <tr key={d.doctorId} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.specialization}</p>
                      </td>
                      <td className="px-6 py-4 font-semibold">{formatPKR(d.totalEarned)}</td>
                      <td className="px-6 py-4 text-emerald-600 font-medium">{formatPKR(d.totalPaid)}</td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-amber-600">{formatPKR(d.totalPending)}</span>
                        {d.pendingCount > 0 && (
                          <span className="ml-1.5 text-[10px] text-muted-foreground">({d.pendingCount})</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">{formatDate(d.lastPaidAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => exportDoctorStatement(d.doctorId, d.name)}
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" /> Statement
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {doctorSummaries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                        No doctor earnings match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions view */}
      {view === "transactions" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Transaction Ledger</CardTitle>
            <CardDescription>Settle individual payments and audit the full record</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-6 py-4">Txn</th>
                    <th className="px-6 py-4">Patient</th>
                    <th className="px-6 py-4">Doctor</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Dr Share</th>
                    <th className="px-6 py-4">Payment</th>
                    <th className="px-6 py-4">Refund</th>
                    <th className="px-6 py-4">Payout</th>
                    <th className="px-6 py-4">Proof</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((tx) => {
                    const isCompleted = tx.status === "completed";
                    const isPaid = tx.payout_status === "paid";
                    return (
                      <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs">{tx.transaction_id ?? tx.id.slice(0, 8)}</td>
                        <td className="px-6 py-4 font-medium">{tx.patient?.full_name ?? "Patient"}</td>
                        <td className="px-6 py-4">{tx.doctor?.profile?.full_name ?? "Doctor"}</td>
                        <td className="px-6 py-4 text-xs text-muted-foreground">{formatDate(tx.created_at)}</td>
                        <td className="px-6 py-4 font-semibold">{formatPKR(Number(tx.amount))}</td>
                        <td className="px-6 py-4 text-xs font-semibold">{formatPKR(Number(tx.doctor_earning))}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${paymentStatusClass(tx.status as PaymentStatus)}`}>
                            {PAYMENT_STATUS_LABEL[tx.status as PaymentStatus] ?? tx.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-semibold text-slate-600">
                            {REFUND_STATUS_LABEL[(tx.refund_status ?? "not_applicable") as RefundStatus]}
                          </span>
                          {(tx.refund_status === "pending" || tx.refund_status === "refunded") && tx.refund_amount != null && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {formatPKR(Number(tx.refund_amount))}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${isCompleted ? "bg-emerald-100 text-emerald-800" : payoutBadgeClass(tx.payout_status)}`}>
                            {isCompleted ? "With doctor" : isPaid ? "Paid" : "Pending"}
                          </span>
                          {isPaid && tx.paid_at && (
                            <p className="text-[10px] text-muted-foreground mt-1">{formatDate(tx.paid_at)}</p>
                          )}
                          {isPaid && (tx as any).payout_receipt_url && (
                            <button
                              onClick={() => setViewPayoutReceiptUrl({
                                url: (tx as any).payout_receipt_url,
                                doctorName: tx.doctor?.profile?.full_name ?? "Doctor",
                                reference: tx.payout_reference ?? "—",
                              })}
                              className="mt-1 inline-flex items-center gap-1 text-[10px] text-brand-600 hover:text-brand-800 font-medium hover:underline"
                            >
                              <Receipt className="h-3 w-3" /> Receipt
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {tx.proof_url ? (
                            <button
                              onClick={() => setViewProofPayment(tx)}
                              title="View payment attachment"
                              className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-800 font-medium hover:underline"
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                              View
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {tx.refund_status === "pending" || tx.refund_status === "processing" ? (
                            <Button
                              size="sm"
                              disabled={actionId === tx.id}
                              onClick={() => handleProcessRefund(tx.id)}
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {actionId === tx.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                              Refund
                            </Button>
                          ) : isCompleted ? (
                            <span className="text-[10px] font-medium text-emerald-700">Received by doctor</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Not collected</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center text-sm text-muted-foreground">
                        No transactions match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attachment viewer modal — available for all payments (pending & approved) */}
      {viewProofPayment && (
        <AttachmentViewerModal
          payment={viewProofPayment}
          onClose={() => setViewProofPayment(null)}
        />
      )}

      {/* Payout receipt viewer */}
      {viewPayoutReceiptUrl && (
        <PayoutReceiptViewerModal
          url={viewPayoutReceiptUrl.url}
          doctorName={viewPayoutReceiptUrl.doctorName}
          reference={viewPayoutReceiptUrl.reference}
          onClose={() => setViewPayoutReceiptUrl(null)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Attachment Viewer Modal
   Handles image (inline preview) and PDF (iframe) with a download fallback.
   Shows a "No attachment" state when proof_url is absent.
───────────────────────────────────────────────────────────────────────────── */
function AttachmentViewerModal({
  payment,
  onClose,
}: {
  payment: AdminPayment;
  onClose: () => void;
}) {
  const url = payment.proof_url ?? null;

  // Strip query string before checking extension
  const rawPath = url ? url.split("?")[0] : "";
  const isPdf = rawPath.toLowerCase().endsWith(".pdf");

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-card rounded-2xl max-w-2xl w-full shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b flex items-start justify-between gap-3 shrink-0">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-brand-500" />
              Payment Attachment
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {payment.patient?.full_name ?? "Patient"} &rarr;{" "}
              {payment.doctor?.profile?.full_name ?? "Doctor"} &mdash;{" "}
              {formatPKR(Number(payment.amount))} via {METHOD_LABEL[payment.payment_method as PaymentMethod] ?? payment.payment_method}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Payment meta strip */}
        <div className="px-5 py-3 border-b bg-muted/30 flex flex-wrap gap-x-6 gap-y-1.5 text-xs shrink-0">
          <span>
            <span className="text-muted-foreground">Status: </span>
            <span className="font-semibold capitalize">{payment.status}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Submitted: </span>
            <span className="font-medium">{formatDate(payment.created_at)}</span>
          </span>
          {payment.reviewed_at && (
            <span>
              <span className="text-muted-foreground">Reviewed: </span>
              <span className="font-medium">{formatDate(payment.reviewed_at)}</span>
            </span>
          )}
          {payment.transaction_id && (
            <span className="font-mono">
              <span className="text-muted-foreground">Txn: </span>
              {payment.transaction_id}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5 min-h-0">
          {!url ? (
            /* No attachment state */
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Paperclip className="h-10 w-10 opacity-25" />
              <p className="text-sm font-medium">No attachment uploaded</p>
              <p className="text-xs">This payment was submitted without a proof screenshot.</p>
            </div>
          ) : isPdf ? (
            /* PDF preview via iframe */
            <div className="rounded-lg border border-border overflow-hidden bg-muted/10 h-[55vh]">
              <iframe
                src={url}
                title="Payment proof PDF"
                className="w-full h-full"
              />
            </div>
          ) : (
            /* Image preview */
            <div className="rounded-lg border border-border overflow-hidden bg-muted/20 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Payment proof"
                className="max-w-full max-h-[55vh] object-contain"
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t flex items-center justify-between gap-3 shrink-0">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-800 hover:underline"
            >
              <Download className="h-4 w-4" />
              Download attachment
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </a>
          ) : (
            <span />
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Payout Receipt Viewer Modal
   Shows the admin-uploaded payout receipt for a settled transaction.
───────────────────────────────────────────────────────────────────────────── */
function PayoutReceiptViewerModal({
  url,
  doctorName,
  reference,
  onClose,
}: {
  url: string;
  doctorName: string;
  reference: string;
  onClose: () => void;
}) {
  const rawPath = url.split("?")[0];
  const isPdf = rawPath.toLowerCase().endsWith(".pdf");

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card rounded-2xl max-w-2xl w-full shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b flex items-start justify-between gap-3 shrink-0">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-brand-500" />
              Payout Receipt
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Settlement for <span className="font-medium">{doctorName}</span>
              {reference !== "—" && <> &mdash; Ref: <span className="font-mono">{reference}</span></>}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5 min-h-0">
          {isPdf ? (
            <div className="rounded-lg border border-border overflow-hidden bg-muted/10 h-[55vh]">
              <iframe src={url} title="Payout receipt PDF" className="w-full h-full" />
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden bg-muted/20 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Payout receipt" className="max-w-full max-h-[55vh] object-contain" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t flex items-center justify-between gap-3 shrink-0">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-800 hover:underline"
          >
            <Download className="h-4 w-4" />
            Download receipt
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </a>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
