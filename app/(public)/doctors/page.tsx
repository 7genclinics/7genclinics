import { pageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbListJsonLd } from "@/lib/seo/site";
import { LandingHeader } from "@/components/public/LandingHeader";
import { LandingFooter } from "@/components/public/LandingFooter";
import { DoctorsBrowse } from "@/components/public/DoctorsBrowse";
import { getApprovedDoctorsServer } from "@/lib/public/doctors";
import { Suspense } from "react";

export const metadata = pageMetadata({
  title: "Find a doctor",
  description:
    "Browse PMDC verified doctors across Pakistan. Book video, chat, or clinic visits online and in person.",
  path: "/doctors/",
});

export default async function DoctorsPage() {
  let doctors: Awaited<ReturnType<typeof getApprovedDoctorsServer>> = [];
  try {
    doctors = await getApprovedDoctorsServer();
  } catch {
    doctors = [];
  }

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={breadcrumbListJsonLd([{ name: "Doctors", path: "/doctors/" }])} />
      <LandingHeader />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <Suspense fallback={null}>
          <DoctorsBrowse initialDoctors={doctors} layout="list" showFilters />
        </Suspense>
      </main>
      <LandingFooter />
    </div>
  );
}
