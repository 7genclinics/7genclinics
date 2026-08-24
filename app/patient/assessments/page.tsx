"use client";

import { useLayoutEffect } from "react";
import { useRouter } from "next/navigation";

export default function PatientAssessmentsHistoryPage() {
  const router = useRouter();

  useLayoutEffect(() => {
    router.replace("/patient/dashboard");
  }, [router]);

  return (
    <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
      Redirecting…
    </div>
  );
}
