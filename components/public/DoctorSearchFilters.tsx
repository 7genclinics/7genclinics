"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SpecialtyFilterPicker } from "@/components/public/SpecialtyFilterPicker";
import {
  ALL_CITIES_LABEL,
  buildDoctorSearchUrl,
  getActiveFilterCount,
  getActiveTaxonomyFilter,
  parseDoctorSearchParams,
  type DoctorSearchFilters,
} from "@/lib/public/doctor-filters";
import { PAKISTAN_CITIES } from "@/types";
import { cn } from "@/lib/utils";

interface DoctorSearchFiltersProps {
  resultCount: number;
  className?: string;
}

export function DoctorSearchFilters({ resultCount, className }: DoctorSearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = parseDoctorSearchParams(searchParams);
  const activeCount = getActiveFilterCount(filters);
  const activeTaxonomy = getActiveTaxonomyFilter(filters);
  const [specialtyOpen, setSpecialtyOpen] = useState(false);

  const updateFilters = (patch: Partial<DoctorSearchFilters>, resetKeys?: (keyof DoctorSearchFilters)[]) => {
    const next = { ...filters, ...patch };
    if (resetKeys) {
      for (const key of resetKeys) {
        delete next[key];
      }
    }
    router.push(buildDoctorSearchUrl(next));
  };

  const clearAll = () => router.push("/doctors");

  const toggleFlag = (key: "topReviewed" | "availableNow") => {
    updateFilters({ [key]: filters[key] ? undefined : true });
  };

  return (
    <div className={cn("relative space-y-4", className)}>
      <div className="relative z-40 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row">
          <div className="relative lg:w-44">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
            <select
              value={filters.city ?? ALL_CITIES_LABEL}
              onChange={(e) =>
                updateFilters({
                  city: e.target.value === ALL_CITIES_LABEL ? undefined : e.target.value,
                })
              }
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm font-medium"
            >
              <option value={ALL_CITIES_LABEL}>{ALL_CITIES_LABEL}</option>
              {PAKISTAN_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <form
            className="relative flex flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              updateFilters({ q: (fd.get("q") as string) || undefined });
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              key={filters.q ?? "empty"}
              defaultValue={filters.q ?? ""}
              placeholder="Search by doctor name or specialty..."
              className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
            />
            <Button
              type="submit"
              className="ml-2 hidden h-11 rounded-xl bg-[#102c7b] px-5 text-white hover:bg-[#152a45] sm:inline-flex"
            >
              Search
            </Button>
          </form>
        </div>
      </div>

      <div className="relative z-40 flex flex-wrap items-center gap-2">
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
          >
            <X className="h-3.5 w-3.5" />
            Clear Filters
          </button>
        )}

        {activeTaxonomy && (
          <FilterChip active onClick={() => updateFilters({}, ["symptom", "condition"])}>
            {activeTaxonomy.label}
          </FilterChip>
        )}

        <FilterChip
          active={filters.topReviewed === true}
          onClick={() => toggleFlag("topReviewed")}
        >
          Top Reviewed
        </FilterChip>

        <FilterChip
          active={filters.availableNow === true}
          onClick={() => toggleFlag("availableNow")}
        >
          Available Now
        </FilterChip>

        <FilterChip
          active={filters.maxFee === 2000}
          onClick={() =>
            updateFilters({ maxFee: filters.maxFee === 2000 ? undefined : 2000 })
          }
        >
          Fee up to Rs. 2,000
        </FilterChip>

        <FilterChip
          active={filters.maxFee === 5000}
          onClick={() =>
            updateFilters({ maxFee: filters.maxFee === 5000 ? undefined : 5000 })
          }
        >
          Fee up to Rs. 5,000
        </FilterChip>

        <div className="relative min-w-[11rem]">
          <SpecialtyFilterPicker
            value={filters.specialty ?? "All"}
            open={specialtyOpen}
            onOpenChange={setSpecialtyOpen}
            fieldClassName={cn(
              "h-9 w-full rounded-full border px-3 pl-9 pr-8 text-xs font-semibold transition-all",
              filters.specialty
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-brand-200"
            )}
            panelClassName="min-w-[18rem]"
            onChange={(next) =>
              updateFilters({
                specialty: next === "All" ? undefined : next,
              })
            }
          />
        </div>

        <div className="relative">
          <select
            value={filters.minRating ?? ""}
            onChange={(e) =>
              updateFilters({
                minRating: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className={cn(
              "h-9 appearance-none rounded-full border px-4 pr-8 text-xs font-semibold transition-all",
              filters.minRating
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-brand-200"
            )}
          >
            <option value="">Min Rating</option>
            <option value="4">4+ Stars</option>
            <option value="4.5">4.5+ Stars</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-60" />
        </div>

        <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {resultCount} doctor{resultCount !== 1 ? "s" : ""} found
        </span>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
        active
          ? "border-brand-500 bg-brand-500 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-600"
      )}
    >
      {children}
    </button>
  );
}
