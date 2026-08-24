"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import type { DoctorMedicine } from "@/lib/clinic/types";

export function MedicinePicker({
  medicines,
  value,
  onSelect,
  placeholder = "Search medicine",
}: {
  medicines: DoctorMedicine[];
  value: string;
  onSelect: (medicine: DoctorMedicine | { name: string; dosage_options: string[] }) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = q
      ? medicines.filter(
          (m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
        )
      : medicines;
    return list.slice(0, 8);
  }, [medicines, value]);

  return (
    <div className="relative sm:col-span-3">
      <Input
        placeholder={placeholder}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setOpen(true);
          onSelect({ name: e.target.value, dosage_options: [] });
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-background shadow-md">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              {medicines.length === 0
                ? "No medicines in your list yet."
                : "No match — keep typing to add a custom name."}
            </li>
          ) : (
            matches.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(m);
                    setOpen(false);
                  }}
                >
                  <span>{m.name}</span>
                  <span className="text-[11px] capitalize text-muted-foreground">{m.category}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
