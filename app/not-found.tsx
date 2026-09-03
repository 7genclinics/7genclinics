import type { Metadata } from "next";
import Link from "next/link";
import { LandingHeader } from "@/components/public/LandingHeader";
import { LandingFooter } from "@/components/public/LandingFooter";
import { Button } from "@/components/ui/Button";
import { BRAND } from "@/lib/brand/site";

export const metadata: Metadata = {
  title: `Page not found | ${BRAND.name}`,
  description: "This page does not exist. Return home or browse verified doctors on Apna Clinic.",
  robots: { index: false, follow: true, nocache: true },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">404</p>
        <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight text-brand-950 sm:text-4xl">
          This page is not available
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-brand-900/70">
          The link may be broken or the page was moved. Use a path below to continue on Apna Clinic.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/">
            <Button>Home</Button>
          </Link>
          <Link href="/doctors/">
            <Button variant="outline">Find a doctor</Button>
          </Link>
          <Link href="/clinics/">
            <Button variant="outline">Clinics</Button>
          </Link>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
