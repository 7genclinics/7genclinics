"use client";

import { ClinicPatientProfile } from "@/components/clinic/ClinicPatientProfile";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ReceptionPatientDetailInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const visit = search.get("visit");

  return (
    <div className="space-y-4">
      <Link href="/reception/patients" className="text-sm text-muted-foreground hover:underline">
        ← Back to search
      </Link>
      {params.id ? (
        <ClinicPatientProfile patientId={params.id} mode="reception" visitAppointmentId={visit} />
      ) : null}
    </div>
  );
}

export default function ReceptionPatientDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading patient…</p>}>
      <ReceptionPatientDetailInner />
    </Suspense>
  );
}
