"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DoctorCatalogCard } from "@/components/public/DoctorCatalogCard";
import { filterDoctors } from "@/lib/public/doctor-filters";
import { mapToDoctorCard } from "@/lib/patient/mappers";
import type { DoctorWithProfile } from "@/lib/patient/types";

const LANDING_DOCTOR_LIMIT = 6;

interface LandingDoctorsSectionProps {
  doctors: DoctorWithProfile[];
}

export function LandingDoctorsSection({ doctors }: LandingDoctorsSectionProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const visibleDoctors = useMemo(() => {
    const results = query.trim()
      ? filterDoctors(doctors, { q: query.trim() })
      : doctors.map(mapToDoctorCard);
    return results.slice(0, LANDING_DOCTOR_LIMIT);
  }, [doctors, query]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/doctors?q=${encodeURIComponent(trimmed)}` : "/doctors");
  };

  return (
    <section id="doctors" className="border-t border-brand-900/8 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
          Verified panel
        </p>
        <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">
          Search Doctors
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Every profile is PMDC verified. See specialty, fee, and online plus physical care options,
          then book video or a clinic slot.
        </p>

        <form
          onSubmit={handleSearch}
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-stretch"
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name"
              className="h-12 w-full rounded-full border border-brand-900/10 bg-white pl-11 pr-4 text-sm text-brand-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
            />
          </div>
          <Button
            type="submit"
            className="h-12 shrink-0 rounded-full bg-brand-500 px-8 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Search
          </Button>
        </form>

        {visibleDoctors.length > 0 ? (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleDoctors.map((doctor) => (
              <DoctorCatalogCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-brand-900/12 bg-white px-6 py-16 text-center">
            <p className="font-heading text-lg font-semibold text-brand-900">No doctors found</p>
            <p className="mt-2 text-sm text-slate-500">
              {doctors.length === 0
                ? "Verified doctors will appear here once approved."
                : "Try a different name or browse all specialists."}
            </p>
            {doctors.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-4 text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                Clear search
              </button>
            )}
          </div>
        )}

        {doctors.length > 0 && (
          <div className="mt-10 text-center">
            <Link
              href="/doctors"
              className="inline-flex items-center gap-2 rounded-full border border-brand-900/10 bg-white px-6 py-3 text-sm font-semibold text-brand-900 transition-colors hover:border-brand-300 hover:bg-[#f7fbfb]"
            >
              View all doctors
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
