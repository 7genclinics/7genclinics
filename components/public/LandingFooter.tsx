import Link from "next/link";
import { BrandMark, ConeStripe } from "@/components/brand/BrandMark";
import { BRAND } from "@/lib/brand/site";

const patientLinks = [
  { href: "/doctors", label: "Browse doctors" },
  { href: "/assessment", label: "Self-assessment" },
  { href: "/register", label: "Create account" },
  { href: "/login?role=patient", label: "Patient login" },
];

/** Physical clinic module — login then land on the matching dashboard. */
const clinicFloorLinks = [
  {
    href: "/login?role=receptionist&redirect=/reception/dashboard",
    label: "Reception desk",
  },
  {
    href: "/login?role=receptionist&redirect=/reception/queue",
    label: "Live queue",
  },
  {
    href: "/login?role=receptionist&redirect=/reception/walk-in",
    label: "Walk-in register",
  },
  {
    href: "/login?role=receptionist&redirect=/reception/billing",
    label: "Desk billing",
  },
  {
    href: "/login?role=doctor&redirect=/doctor/queue",
    label: "Doctor clinic queue",
  },
  {
    href: "/register?role=doctor",
    label: "Join as doctor",
  },
];

export function LandingFooter() {
  return (
    <footer className="bg-brand-950 text-white/70">
      <ConeStripe />
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <BrandMark size="md" variant="reverse" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/55">
              {BRAND.description}
            </p>
          </div>

          <div className="lg:col-span-2">
            <h4 className="mb-4 font-display text-sm font-semibold tracking-tight text-white">
              Patients
            </h4>
            <ul className="space-y-2.5 text-sm">
              {patientLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="mb-4 font-display text-sm font-semibold tracking-tight text-white">
              Clinic floor
            </h4>
            <ul className="space-y-2.5 text-sm">
              {clinicFloorLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h4 className="mb-4 font-display text-sm font-semibold tracking-tight text-white">
              Contact
            </h4>
            <ul className="space-y-2.5 text-sm text-white/55">
              <li>{BRAND.supportEmail}</li>
              <li>{BRAND.phone}</li>
              <li>{BRAND.citiesLabel}</li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-8 text-xs text-white/40 sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {BRAND.name}
          </p>
          <Link
            href="/login?role=admin&redirect=/admin/dashboard"
            className="transition-colors hover:text-white/70"
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
