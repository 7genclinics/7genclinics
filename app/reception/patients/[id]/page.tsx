"use client";

import { ClinicPatientProfile } from "@/components/clinic/ClinicPatientProfile";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ReceptionPatientDetailPage() {
  const params = useParams<{ id: string }>();

  return (
    <div className="space-y-4">
      <Link href="/reception/patients" className="text-sm text-muted-foreground hover:underline">
        ← Back to search
      </Link>
      {params.id ? <ClinicPatientProfile patientId={params.id} mode="reception" /> : null}
    </div>
  );
}
