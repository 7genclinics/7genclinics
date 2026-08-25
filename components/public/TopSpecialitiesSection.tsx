"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SpecialtyIcon } from "@/components/public/SpecialtyIcon";
import { specialtySearchHref, TOP_SPECIALTIES } from "@/lib/public/specialties";

/** 4 rows × 4 columns on large screens */
const INITIAL_VISIBLE = 16;

export function TopSpecialitiesSection() {
  const [showAll, setShowAll] = useState(false);
  const hasMore = TOP_SPECIALTIES.length > INITIAL_VISIBLE;
  const visible = showAll ? TOP_SPECIALTIES : TOP_SPECIALTIES.slice(0, INITIAL_VISIBLE);

  return (
    <section id="specialities" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            Departments
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold uppercase tracking-tight sm:text-4xl">
            <span className="text-brand-900">Top </span>
            <span className="relative text-brand-500">
              Specialities
              <span className="absolute -bottom-1.5 left-0 h-[3px] w-full rounded-full bg-brand-200" />
            </span>
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-slate-500 sm:text-base">
            Connect with certified specialists for every health need.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {visible.map((item) => (
            <Link
              key={item.id}
              href={specialtySearchHref(item)}
              className="group flex min-h-[9.5rem] flex-col items-center justify-center gap-4 rounded-2xl border border-brand-200/60 bg-[#f9fdfd] px-4 py-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:bg-[#f0fafa] hover:shadow-[0_14px_30px_-18px_rgba(15,20,42,0.35)] sm:min-h-[10.5rem]"
            >
              <SpecialtyIcon
                id={item.icon}
                className="transition-transform duration-300 group-hover:scale-105"
              />
              <p className="flex min-h-[2.25rem] items-center justify-center text-xs font-medium leading-snug text-brand-900/80 transition-colors group-hover:text-brand-700 sm:text-[13px]">
                {item.label}
              </p>
            </Link>
          ))}
        </div>

        {hasMore && !showAll && (
          <div className="mt-12 text-center">
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="inline-flex items-center gap-2 rounded-full border border-brand-500 bg-transparent px-6 py-2.5 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
            >
              View all specialities
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
