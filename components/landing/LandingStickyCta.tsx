"use client";

import { BookButton } from "./LandingBooking";

export function LandingStickyCta({
  name,
  physical,
}: {
  name: string;
  physical: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-900/8 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(15,20,42,0.08)] backdrop-blur md:hidden">
      <BookButton type={physical ? "in_person" : "video"} className="h-12 w-full rounded-full">
        Book appointment with {name.split(" ").slice(0, 2).join(" ")}
      </BookButton>
    </div>
  );
}
