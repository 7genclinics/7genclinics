"use client";

import { Suspense } from "react";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import { BRAND } from "@/lib/brand/site";

const AUTH_PANELS = {
  patient: {
    src: "/patient-login-page.jpg",
    alt: `Patient care at ${BRAND.name}`,
    title: "Care that meets you where you are",
    description:
      "Book secure video visits or walk into the clinic — verified doctors across Pakistan.",
  },
  doctor: {
    src: "/login-page-bg.jpg",
    alt: `Healthcare professional at ${BRAND.name}`,
    title: "One queue for clinic and online",
    description:
      "Manage patients, video sessions, and in-clinic visits from a single practice desk.",
  },
  default: {
    src: "/login-page-bg.jpg",
    alt: `${BRAND.name} hybrid clinic platform`,
    title: "Online care. Clinic care. One place.",
    description: BRAND.description,
  },
} as const;

function resolvePanel(pathname: string, role: string | null) {
  const isAuthFlow = pathname === "/login" || pathname === "/register";
  if (!isAuthFlow) return AUTH_PANELS.default;
  if (role === "patient") return AUTH_PANELS.patient;
  if (role === "doctor") return AUTH_PANELS.doctor;
  return AUTH_PANELS.default;
}

function AuthAsideContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const role = searchParams.get("role");
  const panel = resolvePanel(pathname, role);

  return (
    <aside className="relative hidden lg:block min-h-screen overflow-hidden bg-slate-900">
      <Image
        key={panel.src}
        src={panel.src}
        alt={panel.alt}
        fill
        priority
        className="object-cover object-center transition-opacity duration-500"
        sizes="50vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/25 to-slate-900/40" />

      <div className="relative z-10 flex h-full min-h-screen flex-col p-10 text-white">
        <BrandMark href="/" size="md" inverted />

        <div className="mt-auto space-y-4 max-w-md pb-2">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold leading-snug drop-shadow-sm">{panel.title}</h2>
            <p className="text-slate-200 text-sm leading-relaxed drop-shadow-sm">
              {panel.description}
            </p>
          </div>
          <p className="text-xs text-slate-300/90">
            Secure · PMDC-verified doctors · Built for Pakistan
          </p>
        </div>
      </div>
    </aside>
  );
}

function AuthAsideFallback() {
  return (
    <aside className="relative hidden lg:block min-h-screen overflow-hidden bg-slate-900">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-800 to-slate-900" />
    </aside>
  );
}

export function AuthAsidePanel() {
  return (
    <Suspense fallback={<AuthAsideFallback />}>
      <AuthAsideContent />
    </Suspense>
  );
}
