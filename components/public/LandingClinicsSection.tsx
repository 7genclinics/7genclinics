import Link from "next/link";
import { ArrowRight, Building2, MapPin } from "lucide-react";
import type { Organization } from "@/lib/org/types";
import { clinicPublicPath, organizationKindLabel } from "@/lib/org/paths";

export function ClinicDirectoryCards({ clinics }: { clinics: Organization[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {clinics.map((clinic) => (
        <Link
          key={clinic.id}
          href={clinicPublicPath(clinic.slug)}
          className="group rounded-2xl border border-brand-900/8 bg-[#f4f8f8] p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <Building2 className="h-8 w-8 text-brand-600" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-brand-600">
            {organizationKindLabel(clinic.kind)}
          </p>
          <h3 className="mt-1 font-heading text-xl font-semibold tracking-tight text-brand-900">
            {clinic.name}
          </h3>
          {clinic.city ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
              <MapPin className="h-4 w-4" />
              {clinic.city}
            </p>
          ) : null}
          {clinic.address ? <p className="mt-1 text-sm text-slate-500">{clinic.address}</p> : null}
          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
            View clinic
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
      ))}
    </div>
  );
}

export function LandingClinicsSection({ clinics }: { clinics: Organization[] }) {
  if (clinics.length === 0) return null;

  return (
    <section id="clinics" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
          Directory
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-xl font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Clinics and hospitals
          </h2>
          <Link
            href="/clinics"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-3 max-w-2xl text-slate-600">
          Find a listed clinic or hospital, then book one of its doctors for video or an in-person visit.
        </p>
        <div className="mt-10">
          <ClinicDirectoryCards clinics={clinics.slice(0, 6)} />
        </div>
      </div>
    </section>
  );
}
