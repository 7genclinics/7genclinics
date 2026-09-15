"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  panelClassName,
  isHero = false,
}: SpecialtyFilterPickerProps) {
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
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
    if (!open) {
      setQuery("");
      return;
    }
    const t = window.setTimeout(() => searchRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
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

  return (
    <div ref={rootRef} className="relative min-w-0">
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
        aria-haspopup="listbox"
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

      {open && (
        <div
          className={cn(
            "absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 overflow-hidden rounded-2xl border border-brand-900/10 bg-white shadow-[0_28px_70px_-28px_rgba(18,53,58,0.45)]",
            isHero && "min-w-[18rem] lg:left-auto lg:right-0 lg:w-[22rem]",
            panelClassName
          )}
          role="listbox"
        >
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any specialty…"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400/20"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear specialty search"
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[min(22rem,55vh)] overflow-y-auto overscroll-contain py-2">
            {filteredMain.length > 0 && (
              <div className="px-2 pb-1">
                <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
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
                            "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
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
              <div className="border-t border-slate-100 px-2 pt-2">
                <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
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
                            "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
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
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-semibold text-slate-800">No specialty found</p>
                <p className="mt-1 text-xs text-slate-500">Try another spelling or browse main specialties.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
