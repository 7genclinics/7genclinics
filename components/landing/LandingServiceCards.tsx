"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ArrowRight, Check, Sparkles, Stethoscope, Video } from "lucide-react";
import type { PublicLandingService } from "@/lib/landing/types";
import { cn } from "@/lib/utils";
import { BookButton } from "./LandingBooking";

const FALLBACK_IMAGES = [
  "/wellness_concept.jpg",
  "/online_consultation.jpg",
  "/patient-login-page.jpg",
];

function defaultBenefits(service: PublicLandingService): string[] {
  if (service.benefits.length > 0) return service.benefits.slice(0, 3);
  if (service.consultationTypes.includes("in_person")) {
    return [
      "In-person examination at the clinic",
      "Reception check-in and queue token",
      "Clear next steps after your visit",
    ];
  }
  if (service.consultationTypes.includes("video")) {
    return [
      "Secure video from home",
      "Prepaid confirmed session",
      "Notes and prescription after",
    ];
  }
  return [service.description].filter(Boolean).slice(0, 3);
}

export function LandingServiceCards({
  services,
}: {
  services: PublicLandingService[];
}) {
  const [filter, setFilter] = useState("all");
  const hasPhysical = services.some((service) => service.consultationTypes.includes("in_person"));
  const hasOnline = services.some((service) => service.consultationTypes.includes("video"));
  const chips = [
    { id: "all", label: "All Services" },
    ...(hasPhysical ? [{ id: "in_person", label: "Physical" }] : []),
    ...(hasOnline ? [{ id: "video", label: "Online" }] : []),
  ];

  const visible = useMemo(() => {
    if (filter === "all") return services;
    return services.filter((service) => service.consultationTypes.includes(filter as "in_person" | "video"));
  }, [filter, services]);

  return (
    <div>
      <div className="mb-10 flex justify-center gap-2 overflow-x-auto pb-1">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFilter(chip.id)}
            className={cn(
              "shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
              filter === chip.id
                ? "bg-brand-800 text-white shadow-sm"
                : "border border-brand-900/10 bg-white text-brand-900 hover:bg-brand-50",
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((service, index) => {
          const Icon = service.consultationTypes.includes("video") ? Video : Stethoscope;
          const bullets = defaultBenefits(service);
          return (
            <article
              key={service.id}
              className="flex flex-col overflow-hidden rounded-[1.5rem] border border-brand-900/8 bg-white shadow-[0_12px_40px_rgba(15,20,42,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(15,20,42,0.1)]"
            >
              <div className="flex items-start justify-between gap-3 px-5 pt-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="font-serif text-xl font-semibold tracking-tight text-brand-900">
                    {service.name}
                  </h3>
                </div>
                {service.featured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#e8d9b0] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-900">
                    <Sparkles className="h-3 w-3" />
                    Popular
                  </span>
                )}
              </div>
              <div className="relative mx-5 mt-4 aspect-[5/3.4] overflow-hidden rounded-xl bg-brand-50">
                <Image
                  src={service.imageUrl || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 360px"
                  unoptimized={Boolean(service.imageUrl)}
                />
              </div>
              <div className="flex flex-1 flex-col px-5 py-5">
                <ul className="space-y-2 text-sm text-slate-600">
                  {bullets.map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <BookButton
                  type={service.consultationTypes[0]}
                  serviceId={service.serviceId}
                  className="mt-6 h-11 w-full rounded-full bg-brand-800 hover:bg-brand-900"
                >
                  Learn More
                  <ArrowRight className="ml-2 h-4 w-4" />
                </BookButton>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
