import { Suspense } from "react";
import { LandingHeader } from "@/components/public/LandingHeader";
import { LandingFooter } from "@/components/public/LandingFooter";
import { DoctorsBrowse } from "@/components/public/DoctorsBrowse";
import { getApprovedDoctorsServer } from "@/lib/public/doctors";

export const metadata = {
  title: "Find a Doctor | Wasl Clinic",
  description:
    "Browse PMDC-verified doctors across Pakistan. Book video, chat, or in-clinic visits.",
};

export default async function DoctorsPage() {
  let doctors: Awaited<ReturnType<typeof getApprovedDoctorsServer>> = [];
  try {
    doctors = await getApprovedDoctorsServer();
  } catch {
    doctors = [];
  }

  return (
    <div className="min-h-screen bg-[#f8fafb]">
      <LandingHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Suspense fallback={null}>
          <DoctorsBrowse initialDoctors={doctors} layout="list" showFilters />
        </Suspense>
      </main>
      <LandingFooter />
    </div>
  );
}
