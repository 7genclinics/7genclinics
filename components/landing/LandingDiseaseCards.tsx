"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { ALL_TAXONOMY_ITEMS } from "@/lib/public/catalog";
import type { LandingExpertiseItem } from "@/lib/landing/types";
import { BookButton } from "./LandingBooking";

const FALLBACK_IMAGES = [
  "/anxiety_depression_medical_3d.png",
  "/stress_burnout_3d.png",
  "/sleep_issues_3d.png",
  "/panic_attacks_3d.png",
  "/wellness_concept.png",
  "/online_consultation.png",
];

function resolveDiseaseImage(item: LandingExpertiseItem, index: number): string {
  if (item.imageUrl) return item.imageUrl;
  const lower = item.label.toLowerCase();
  const match = ALL_TAXONOMY_ITEMS.find(
    (catalog) =>
      catalog.label.toLowerCase() === lower ||
      catalog.keywords.some((keyword) => lower.includes(keyword)) ||
      lower.includes(catalog.label.toLowerCase()),
  );
  if (match?.image) return match.image;
  return FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
}

export function LandingDiseaseCards({
  items,
}: {
  items: LandingExpertiseItem[];
}) {
  if (!items.length) return null;

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => {
        const image = resolveDiseaseImage(item, index);
        const custom = Boolean(item.imageUrl);
        return (
          <article
            key={item.id}
            className="group flex flex-col overflow-hidden rounded-[1.5rem] border border-brand-900/8 bg-white shadow-[0_12px_40px_rgba(15,20,42,0.05)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(15,20,42,0.1)]"
          >
            <div className="relative aspect-[5/3.2] overflow-hidden bg-brand-50">
              <Image
                src={image}
                alt=""
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                sizes="(max-width: 768px) 100vw, 360px"
                unoptimized={custom}
              />
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h3 className="font-serif text-xl font-semibold tracking-tight text-brand-900">
                {item.label}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                {item.description.trim() ||
                  `Personalized assessment and treatment for ${item.label.toLowerCase()}.`}
              </p>
              <BookButton
                className="mt-5 h-10 w-full rounded-full bg-brand-800 hover:bg-brand-900"
              >
                Learn More
                <ArrowRight className="ml-2 h-4 w-4" />
              </BookButton>
            </div>
          </article>
        );
      })}
    </div>
  );
}
