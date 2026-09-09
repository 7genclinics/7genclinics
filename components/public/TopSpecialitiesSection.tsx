"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ClipboardCheck, Search, X } from "lucide-react";
import { SpecialtyIcon } from "@/components/public/SpecialtyIcon";
import { specialtySearchHref, TOP_SPECIALTIES } from "@/lib/public/specialties";
import { buildDoctorSearchUrl } from "@/lib/public/doctor-filters";
import { cn } from "@/lib/utils";

const COMMON_SEARCHES = [
  "Fever",
  "Cough",
  "Stomach pain",
  "Skin allergy",
  "Anxiety",
  "Child fever",
];

const INITIAL_VISIBLE_COUNT = 12;

export function TopSpecialitiesSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Filter specialities based on search query or active chip
  const filteredSpecialties = useMemo(() => {
    const q = (searchQuery || activeChip || "").trim().toLowerCase();
    if (!q) return TOP_SPECIALTIES;

    return TOP_SPECIALTIES.filter((item) => {
      const matchLabel = item.label.toLowerCase().includes(q);
      const matchTagline = item.tagline?.toLowerCase().includes(q);
      const matchSpecialty = item.specialty?.toLowerCase().includes(q);
      const matchQuery = item.query?.toLowerCase().includes(q);
      const matchKeywords = item.keywords?.some((k) =>
        k.toLowerCase().includes(q) || q.includes(k.toLowerCase())
      );
      return Boolean(matchLabel || matchTagline || matchSpecialty || matchQuery || matchKeywords);
    });
  }, [searchQuery, activeChip]);

  const isFiltering = Boolean(searchQuery.trim() || activeChip);
  const displayedSpecialties = isFiltering
    ? filteredSpecialties
    : showAll
      ? TOP_SPECIALTIES
      : TOP_SPECIALTIES.slice(0, INITIAL_VISIBLE_COUNT);

  const handleChipClick = (chip: string) => {
    if (activeChip === chip) {
      setActiveChip(null);
      setSearchQuery("");
    } else {
      setActiveChip(chip);
      setSearchQuery(chip);
    }
  };

  const handleClear = () => {
    setSearchQuery("");
    setActiveChip(null);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <section id="specialities" className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-24">
      {/* Subtle background ambient blur */}
      <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-brand-100/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-40 h-72 w-72 rounded-full bg-teal-100/30 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header with Centered Titles and Decorative Tagline */}
        <div className="relative mb-12 flex flex-col items-center justify-center text-center sm:mb-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-brand-600">
            Departments
          </p>
          <h2 className="mt-2.5 font-heading text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.65rem]">
            <span className="text-slate-900">Top </span>
            <span className="text-brand-500">Specialities</span>
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Connect with certified specialists for online and physical visits.
          </p>

          {/* Decorative Callout in top right */}
          <div className="mt-4 hidden lg:absolute lg:right-0 lg:top-0 lg:mt-0 lg:block">
            <p className="rotate-[-4deg] text-base font-semibold leading-snug text-brand-500/85">
              Better Healthcare <br />
              <span className="text-brand-600">for a Healthier Pakistan ♡</span>
            </p>
          </div>
        </div>

        {/* Main Grid: Left interactive search card + Right specialities cards */}
        <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-8">
          {/* Left Side: Filter and Symptom Search Card */}
          <div className="flex flex-col justify-between rounded-3xl border border-teal-100/80 bg-[#edf7f6] p-6 shadow-sm transition-all sm:p-7 lg:col-span-4 lg:sticky lg:top-24">
            <div>
              {/* Doctor Avatar + Speech Bubble + Tag */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">
                    Find the right doctor
                  </span>
                  <h3 className="mt-2 font-heading text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.65rem] sm:leading-tight">
                    What are you looking for today?
                  </h3>
                </div>

                {/* Avatar with speech bubble */}
                <div className="relative shrink-0">
                  <div className="absolute -top-3 right-0 -translate-y-full whitespace-nowrap rounded-full border border-teal-200/80 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-teal-800 shadow-xs">
                    Not sure? We can help!
                  </div>
                  <div className="relative h-14 w-14 overflow-hidden rounded-full ring-4 ring-white shadow-sm sm:h-16 sm:w-16">
                    <Image
                      src="/doc_female_portrait.jpg"
                      alt="Specialist doctor"
                      fill
                      sizes="64px"
                      className="object-cover object-top"
                    />
                  </div>
                </div>
              </div>

              <p className="mt-3.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
                Search your symptoms, condition or health concern and we'll suggest the right
                specialist for you.
              </p>

              {/* Live Search Input Form */}
              <form onSubmit={handleSearchSubmit} className="relative mt-5">
                <div className="relative flex items-center rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs transition-all focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
                  <Search className="ml-2.5 h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (activeChip && e.target.value !== activeChip) {
                        setActiveChip(null);
                      }
                    }}
                    placeholder="e.g. headache, skin allergy, back pain..."
                    className="w-full bg-transparent px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden sm:text-sm"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="mr-1 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="shrink-0 rounded-xl bg-[#1c7b79] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#15605e]"
                  >
                    Search
                  </button>
                </div>
              </form>

              {/* Common Search Chips */}
              <div className="mt-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                  Common searches
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5 sm:gap-2">
                  {COMMON_SEARCHES.map((chip) => {
                    const isSelected =
                      activeChip === chip || searchQuery.toLowerCase() === chip.toLowerCase();
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => handleChipClick(chip)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                          isSelected
                            ? "border border-teal-700 bg-[#1c7b79] text-white shadow-xs"
                            : "border border-teal-900/10 bg-white/90 text-slate-700 hover:border-teal-500 hover:bg-white hover:text-teal-800"
                        )}
                      >
                        <Search
                          className={cn("h-3 w-3", isSelected ? "text-white" : "text-teal-600")}
                        />
                        {chip}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Assessment Callout */}
            <div className="mt-7 rounded-2xl border border-teal-100 bg-white/90 p-4 shadow-xs backdrop-blur-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-heading text-xs font-bold text-slate-900 sm:text-sm">
                      Not sure what you have?
                    </h4>
                    <p className="mt-0.5 text-[11px] leading-tight text-slate-600">
                      Take a short assessment and get personalized doctor recommendations.
                    </p>
                  </div>
                </div>

                <Link
                  href="/assessment/"
                  aria-label="Take the self assessment"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1c7b79] text-white shadow-xs transition-transform hover:scale-105 hover:bg-[#15605e]"
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right Side: 3-Column Specialties Cards Grid */}
          <div className="lg:col-span-8">
            {/* Active search banner if filtering */}
            {isFiltering && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-teal-100 bg-teal-50/60 px-4 py-2.5 text-xs text-slate-700">
                <p>
                  Showing <strong>{filteredSpecialties.length}</strong>{" "}
                  {filteredSpecialties.length === 1 ? "speciality" : "specialities"} matching{" "}
                  <span className="font-semibold text-teal-800">"{searchQuery || activeChip}"</span>
                </p>
                <button
                  type="button"
                  onClick={handleClear}
                  className="font-semibold text-teal-700 underline hover:text-teal-900"
                >
                  Clear filter
                </button>
              </div>
            )}

            {/* Specialties Grid */}
            {displayedSpecialties.length > 0 ? (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {displayedSpecialties.map((item) => (
                  <Link
                    key={item.id}
                    href={specialtySearchHref(item)}
                    className="group relative flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md sm:p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {/* Icon container with soft colored background */}
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-transform duration-300 group-hover:scale-105",
                          item.bgTint || "border-teal-100 bg-teal-50 text-teal-700"
                        )}
                      >
                        <SpecialtyIcon id={item.icon} className="h-6 w-6" />
                      </div>

                      {/* Text content */}
                      <div className="min-w-0">
                        <h4 className="truncate font-heading text-xs font-bold tracking-tight text-slate-900 transition-colors group-hover:text-brand-600 sm:text-sm">
                          {item.label}
                        </h4>
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 sm:text-xs">
                          {item.tagline || "Specialized expert care"}
                        </p>
                      </div>
                    </div>

                    {/* Arrow Indicator */}
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand-500">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              /* No matching results state */
              <div className="rounded-3xl border border-dashed border-slate-200 bg-[#f9fbfb] p-8 text-center sm:p-12">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                  <Search className="h-6 w-6" />
                </div>
                <h4 className="mt-3 font-heading text-base font-bold text-slate-900">
                  No direct specialities matched "{searchQuery || activeChip}"
                </h4>
                <p className="mx-auto mt-1.5 max-w-md text-xs text-slate-600 sm:text-sm">
                  Try searching with a broader symptom like "pain", "fever", "skin", or search our
                  full doctor directory directly.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href={buildDoctorSearchUrl({ q: searchQuery || activeChip || "" })}
                    className="inline-flex items-center gap-2 rounded-full bg-[#1c7b79] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#15605e]"
                  >
                    Search all doctors for "{searchQuery || activeChip}"
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Clear search
                  </button>
                </div>
              </div>
            )}

            {/* View All Specialities Toggle */}
            {!isFiltering && (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={() => setShowAll((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-full border border-teal-600 bg-white px-6 py-2.5 text-xs font-semibold text-teal-800 shadow-xs transition-all hover:bg-teal-50 hover:text-teal-900 sm:text-sm"
                >
                  {showAll ? "Show less specialities" : "View all specialities"}
                  <ArrowRight
                    className={cn("h-4 w-4 transition-transform", showAll && "-rotate-90")}
                  />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
