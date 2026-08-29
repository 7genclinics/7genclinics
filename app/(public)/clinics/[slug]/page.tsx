import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MapPin, Phone } from "lucide-react";
import { LandingHeader } from "@/components/public/LandingHeader";
import { LandingFooter } from "@/components/public/LandingFooter";
import { DoctorsBrowse } from "@/components/public/DoctorsBrowse";
import {
  getApprovedDoctorsForOrganizationServer,
  getListedOrganizationBySlugServer,
} from "@/lib/public/organizations";
import { organizationKindLabel } from "@/lib/org/paths";
import { BRAND } from "@/lib/brand/site";
import { Suspense } from "react";

interface ClinicPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ClinicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const clinic = await getListedOrganizationBySlugServer(slug);
  if (!clinic) return { title: `Clinic | ${BRAND.name}` };
  return {
    title: `${clinic.name} | ${BRAND.name}`,
    description: clinic.address
      ? `${organizationKindLabel(clinic.kind)} in ${clinic.city ?? "Pakistan"}. ${clinic.address}`
      : `Book a doctor at ${clinic.name}.`,
  };
}

export default async function ClinicPublicPage({ params }: ClinicPageProps) {
  const { slug } = await params;
  const clinic = await getListedOrganizationBySlugServer(slug);
  if (!clinic) notFound();

  let doctors: Awaited<ReturnType<typeof getApprovedDoctorsForOrganizationServer>> = [];
  try {
    doctors = await getApprovedDoctorsForOrganizationServer(clinic.id);
  } catch {
    doctors = [];
  }

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
          {organizationKindLabel(clinic.kind)}
        </p>
        <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          {clinic.name}
        </h1>
        <div className="mt-3 space-y-1 text-slate-600">
          {clinic.city ? (
            <p className="flex items-center gap-1.5 text-sm">
              <MapPin className="h-4 w-4" />
              {[clinic.address, clinic.city].filter(Boolean).join(", ")}
            </p>
          ) : clinic.address ? (
            <p className="text-sm">{clinic.address}</p>
          ) : null}
          {clinic.phone ? (
            <p className="flex items-center gap-1.5 text-sm">
              <Phone className="h-4 w-4" />
              {clinic.phone}
            </p>
          ) : null}
        </div>

        <div className="mt-10">
          <Suspense fallback={null}>
            <DoctorsBrowse
              initialDoctors={doctors}
              clinicSlug={clinic.slug}
              title="Doctors at this clinic"
              subtitle="Book video, chat, or an in-person visit."
              layout="list"
              showFilters={false}
            />
          </Suspense>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
