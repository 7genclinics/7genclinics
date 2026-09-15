"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, Stethoscope, X } from "lucide-react";
import { SPECIALIZATIONS } from "@/types";
import { TOP_SPECIALTIES } from "@/lib/public/specialties";
import { cn } from "@/lib/utils";

export interface SpecialtyChoice {
  /** Value used for specialty= filter, or empty for All. */
  specialty: string;
  label: string;
}

interface SpecialtyFilterPickerProps {
  value: string;
  onChange: (specialty: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldClassName?: string;
  /** Kept for callers; modal ignores anchored panel placement. */
  panelClassName?: string;
  isHero?: boolean;
}

const MAIN_SPECIALTIES: SpecialtyChoice[] = [
  { specialty: "All", label: "All specialties" },
  ...SPECIALIZATIONS.map((s) => ({ specialty: s, label: s })),
];

const MORE_SPECIALTIES: SpecialtyChoice[] = (() => {
  const seen = new Set(MAIN_SPECIALTIES.map((s) => s.label.toLowerCase()));
  const extras: SpecialtyChoice[] = [];
  for (const item of TOP_SPECIALTIES) {
    const label = item.label;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    extras.push({
      specialty: item.specialty ?? label,
      label,
    });
  }
  return extras.sort((a, b) => a.label.localeCompare(b.label));
})();

export function SpecialtyFilterPicker({
  value,
  onChange,
  open,
  onOpenChange,
  fieldClassName,
}: SpecialtyFilterPickerProps) {
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const displayLabel =
    value === "All" || !value
      ? "All specialties"
      : MAIN_SPECIALTIES.find((s) => s.specialty === value)?.label ??
        MORE_SPECIALTIES.find((s) => s.specialty === value)?.label ??
        value;

  const filteredMain = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MAIN_SPECIALTIES;
    return MAIN_SPECIALTIES.filter((s) => s.label.toLowerCase().includes(q));
  }, [query]);

  const filteredMore = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MORE_SPECIALTIES;
    return MORE_SPECIALTIES.filter((s) => s.label.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const t = window.setTimeout(() => searchRef.current?.focus(), 50);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const pick = (specialty: string) => {
    onChange(specialty === "All" ? "All" : specialty);
    onOpenChange(false);
  };

  const modal =
    mounted &&
    open &&
    createPortal(
      <div className="fixed inset-0 z-[80] flex items-start justify-center px-3 py-6 sm:items-center sm:px-4 sm:py-10">
        <button
          type="button"
          aria-label="Close specialty filter"
          className="absolute inset-0 bg-slate-950/45 backdrop-blur-md"
          onClick={() => onOpenChange(false)}
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-label="Choose a specialty"
          className="relative z-[81] flex max-h-[min(92vh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-[0_32px_80px_-24px_rgba(15,23,42,0.55)]"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                Specialty
              </p>
              <h3 className="mt-1 font-heading text-lg font-bold text-slate-900 sm:text-xl">
                Find the right doctor type
              </h3>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any specialty…"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400/20"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear specialty search"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3 sm:px-3">
            {filteredMain.length > 0 && (
              <div className="pb-2">
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Main specialties
                </p>
                <ul className="space-y-0.5">
                  {filteredMain.map((item) => {
                    const selected =
                      (item.specialty === "All" && (value === "All" || !value)) ||
                      item.specialty === value;
                    return (
                      <li key={`main-${item.specialty}`}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => pick(item.specialty)}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-3 text-left text-sm transition-colors sm:py-3.5",
                            selected
                              ? "bg-brand-50 font-semibold text-brand-800"
                              : "text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <span className="truncate">{item.label}</span>
                          {selected && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {filteredMore.length > 0 && (
              <div className="border-t border-slate-100 pt-2">
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {query.trim() ? "Matching specialties" : "More specialties"}
                </p>
                <ul className="space-y-0.5 pb-1">
                  {filteredMore.map((item) => {
                    const selected = item.specialty === value;
                    return (
                      <li key={`more-${item.label}`}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => pick(item.specialty)}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-3 text-left text-sm transition-colors sm:py-3.5",
                            selected
                              ? "bg-brand-50 font-semibold text-brand-800"
                              : "text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <span className="truncate">{item.label}</span>
                          {selected && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {filteredMain.length === 0 && filteredMore.length === 0 && (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-semibold text-slate-800">No specialty found</p>
                <p className="mt-1 text-xs text-slate-500">
                  Try another spelling or clear search to browse main specialties.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <div className="relative min-w-0">
      <Stethoscope
        className={cn(
          "pointer-events-none absolute left-3.5 top-1/2 z-[1] h-4 w-4 -translate-y-1/2",
          value !== "All" && fieldClassName?.includes("text-white")
            ? "text-white/90"
            : "text-slate-400"
        )}
      />
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Specialty"
        onClick={() => onOpenChange(!open)}
        className={cn(
          fieldClassName,
          "flex items-center truncate text-left",
          value !== "All" && !fieldClassName?.includes("text-white") && "font-semibold text-brand-800"
        )}
      >
        <span className="truncate pl-0">{displayLabel}</span>
      </button>
      <ChevronDown
        className={cn(
          "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-transform",
          open && "rotate-180",
          value !== "All" && fieldClassName?.includes("text-white")
            ? "text-white/90"
            : "text-slate-400"
        )}
      />
      {modal}
    </div>
  );
}
