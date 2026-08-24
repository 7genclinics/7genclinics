"use client";

import { MapPin, Phone } from "lucide-react";
import type { LandingContent } from "@/lib/landing/types";

export function DoctorTopBar({ content }: { content: LandingContent }) {
  if (!content.topBarEnabled) return null;

  const phone = content.clinicPhone.trim();
  const address = [content.clinicAddress, content.clinicCity].filter(Boolean).join(", ");
  if (!phone && !address) return null;

  return (
    <div className="bg-amber-500 text-amber-950">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 py-2 text-center text-xs font-semibold sm:justify-between sm:px-6 sm:text-sm">
        {phone ? (
          <a href={`tel:${phone.replace(/\s+/g, "")}`} className="inline-flex items-center gap-1.5 hover:underline">
            <Phone className="h-3.5 w-3.5" />
            {phone}
          </a>
        ) : (
          <span />
        )}
        {address ? (
          <p className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">{address}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
