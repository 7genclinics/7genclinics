"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, MapPin, Search, Star, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import {
  buildDoctorSearchUrl,
  filterDoctors,
  ALL_CITIES_LABEL,
} from "@/lib/public/doctor-filters";
import { getApprovedDoctors } from "@/lib/patient/api";
import { FEATURED_SPECIALTIES } from "@/lib/public/catalog";
import { PAKISTAN_CITIES } from "@/types";
import type { DoctorWithProfile } from "@/lib/patient/types";
import { cn } from "@/lib/utils";

const POPULAR_CITIES = ["Lahore", "Karachi", "Islamabad", "Multan", "Peshawar", "Faisalabad"];

const MAX_LIVE_RESULTS = 6;

interface DoctorSearchHeroProps {
  doctorCount?: number;
  compact?: boolean;
  variant?: "default" | "hero";
  doctors?: DoctorWithProfile[];
}

export function DoctorSearchHero({
  doctorCount = 0,
  compact = false,
  variant,
  doctors: initialDoctors,
}: DoctorSearchHeroProps) {
  const isHero = variant === "hero" || compact;
  const router = useRouter();
  const [city, setCity] = useState(ALL_CITIES_LABEL);
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("All");
  const [showResults, setShowResults] = useState(false);
  const [doctors, setDoctors] = useState<DoctorWithProfile[]>(initialDoctors ?? []);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialDoctors?.length) setDoctors(initialDoctors);
  }, [initialDoctors]);

  useEffect(() => {
    if (initialDoctors?.length) return;
    let cancelled = false;
    getApprovedDoctors()
      .then((data) => {
        if (!cancelled) setDoctors(data);
      })
      .catch(() => {
        if (!cancelled) setDoctors([]);
      });
    return () => {
      cancelled = true;
    };
  }, [initialDoctors]);

  const buildUrl = (overrides?: { city?: string; q?: string; specialty?: string }) => {
    const selectedCity = overrides?.city ?? city;
    const selectedQuery = overrides?.q ?? query;
    const selectedSpecialty = overrides?.specialty ?? specialty;

    return buildDoctorSearchUrl({
      q: selectedQuery,
      city: selectedCity === ALL_CITIES_LABEL ? undefined : selectedCity,
      specialty: selectedSpecialty === "All" ? undefined : selectedSpecialty,
    });
  };

  const hasActiveSearch =
    query.trim().length > 0 || specialty !== "All" || city !== ALL_CITIES_LABEL;

  const doctorPool = doctors.length > 0 ? doctors : (initialDoctors ?? []);

  const liveResults = useMemo(() => {
    if (!hasActiveSearch) return [];
    return filterDoctors(doctorPool, {
      q: query.trim() || undefined,
      city: city === ALL_CITIES_LABEL ? undefined : city,
      specialty: specialty === "All" ? undefined : specialty,
    });
  }, [doctorPool, query, city, specialty, hasActiveSearch]);

  const visibleResults = liveResults.slice(0, MAX_LIVE_RESULTS);
  const panelOpen = showResults && hasActiveSearch;

  useEffect(() => {
    if (!panelOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [panelOpen]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setShowResults(false);
    router.push(buildUrl());
  };

  const selectCity = (selected: string) => {
    setCity(selected);
    setShowResults(true);
  };

  const fieldClass = isHero
    ? "h-14 w-full appearance-none bg-transparent pl-10 pr-8 text-sm text-brand-900 placeholder:text-slate-400 focus:outline-none"
    : "h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm font-medium text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20";

  return (
    <div className="relative">
      <div ref={containerRef} className="relative z-40">
        <form
          onSubmit={handleSearch}
          className={cn(
            isHero
              ? "grid grid-cols-1 divide-y divide-brand-900/10 bg-white lg:grid-cols-[11.5rem_minmax(0,1fr)_13rem_auto] lg:divide-x lg:divide-y-0"
              : "flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-xl shadow-slate-200/50 sm:p-3 lg:flex-row lg:items-stretch"
          )}
        >
          <div className="relative min-w-0">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setShowResults(true);
              }}
              aria-label="City"
              className={fieldClass}
            >
              <option value={ALL_CITIES_LABEL}>{ALL_CITIES_LABEL}</option>
              {PAKISTAN_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              placeholder="Doctor, specialty, or condition"
              className={cn(fieldClass, !isHero && "bg-white pl-10")}
            />
          </div>

          <div className="relative min-w-0">
            <Stethoscope className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={specialty}
              onChange={(e) => {
                setSpecialty(e.target.value);
                setShowResults(true);
              }}
              aria-label="Specialty"
              className={fieldClass}
            >
              <option value="All">All specialties</option>
              {FEATURED_SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          <Button
            type="submit"
            className={cn(
              "gap-2 rounded-none bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600",
              isHero ? "h-14 px-8 lg:min-w-[8.5rem]" : "h-12 rounded-xl px-8 lg:min-w-[120px]"
            )}
          >
            <Search className="h-4 w-4" />
            Search
          </Button>
        </form>

        {panelOpen && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden border border-brand-900/10 bg-white shadow-[0_24px_60px_-24px_rgba(18,53,58,0.35)]">
            <div className="flex items-center justify-between border-b border-brand-900/8 px-4 py-2.5">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                {liveResults.length > 0
                  ? `${liveResults.length} doctor${liveResults.length === 1 ? "" : "s"}`
                  : "No matches"}
              </p>
              {liveResults.length > 0 && (
                <Link
                  href={buildUrl()}
                  onClick={() => setShowResults(false)}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  View all
                </Link>
              )}
            </div>

            {visibleResults.length > 0 ? (
              <ul className="max-h-[22rem] divide-y divide-slate-100 overflow-y-auto">
                {visibleResults.map((doc) => (
                  <li key={doc.id}>
                    <Link
                      href={doc.publicHref}
                      onClick={() => setShowResults(false)}
                      className="flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-50/70"
                    >
                      <UserAvatar
                        name={doc.name}
                        avatarUrl={doc.avatarUrl}
                        size="sm"
                        className="h-11 w-11"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-sm font-semibold text-slate-900">
                          {doc.name}
                        </p>
                        <p className="truncate text-xs font-medium text-brand-600">
                          {doc.specialization}
                        </p>
                        <p className="flex items-center gap-1 text-[11px] text-slate-500">
                          <MapPin className="h-3 w-3" />
                          {doc.city}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {doc.rating > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-600">
                            <Star className="h-3 w-3 fill-amber-500" />
                            {doc.rating.toFixed(1)}
                          </span>
                        )}
                        <p className="text-xs font-semibold text-slate-700">{doc.consultationFee}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="font-display text-sm font-semibold text-slate-900">
                  No doctors match your search
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Try a different name, specialty, or city.
                </p>
                <Link
                  href="/doctors"
                  onClick={() => setShowResults(false)}
                  className="mt-3 inline-block text-xs font-semibold text-brand-600 hover:underline"
                >
                  Browse all doctors
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className={cn(
          "mt-4 flex flex-wrap items-center gap-x-1 gap-y-2",
          isHero ? "text-white/75" : "text-slate-500"
        )}
      >
        <span className="mr-2 text-[11px] font-medium uppercase tracking-[0.16em]">
          {doctorCount > 0 ? `${doctorCount} doctors in` : "Cities"}
        </span>
        {POPULAR_CITIES.map((c, i) => (
          <span key={c} className="inline-flex items-center">
            {i > 0 && <span className="mx-2 opacity-40">·</span>}
            <button
              type="button"
              onClick={() => selectCity(c)}
              className={cn(
                "text-sm transition-colors",
                city === c
                  ? isHero
                    ? "text-white"
                    : "text-brand-600"
                  : isHero
                    ? "hover:text-white"
                    : "hover:text-brand-600"
              )}
            >
              {c}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
