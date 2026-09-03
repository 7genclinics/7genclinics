import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { MAIN_LANDING_NAV } from "@/lib/brand/main-nav";
import { BRAND } from "@/lib/brand/site";
import type { LandingSocialPlatform, PublicLandingPageData } from "@/lib/landing/types";
import { availabilitySummary } from "@/lib/landing/display";

const SOCIAL_LABELS: Record<LandingSocialPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  twitter: "X",
  youtube: "YouTube",
  website: "Website",
};

export function DoctorContactBar({ data }: { data: PublicLandingPageData }) {
  const { content, availability } = data;
  const items = [
    content.clinicPhone
      ? { icon: Phone, label: "Phone", value: content.clinicPhone }
      : null,
    content.clinicAddress || content.clinicCity
      ? {
          icon: MapPin,
          label: "Location",
          value: [content.clinicAddress, content.clinicCity].filter(Boolean).join(", "),
        }
      : null,
    content.clinicEmail
      ? { icon: Mail, label: "Email", value: content.clinicEmail }
      : null,
    {
      icon: Clock,
      label: "Hours",
      value: content.clinicHours || availabilitySummary(availability),
    },
  ].filter(Boolean) as { icon: typeof Phone; label: string; value: string }[];

  return (
    <div id="contact" className="border-y border-brand-900/8 bg-white">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-7 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50">
              <item.icon className="h-4 w-4 text-brand-600" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-500">
                {item.label}
              </p>
              <p className="mt-0.5 text-sm font-medium text-brand-900">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DoctorSiteFooter({ data }: { data: PublicLandingPageData }) {
  const { doctor, content, services } = data;
  const quick = MAIN_LANDING_NAV;

  const mainServices = [
    { href: "/#services", label: "Video consultation" },
    { href: "/#services", label: "Clinic appointment" },
    { href: "/#visit", label: "Walk-in visit" },
    { href: "/assessment/", label: "Self-assessment" },
    { href: "/doctors/", label: "Find a doctor" },
  ];

  return (
    <footer className="bg-white text-slate-600">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <BrandMark href="/" size="md" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">
            {content.footerTagline || BRAND.tagline}
          </p>
          {content.socials.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {content.socials.map((social) => (
                <Link
                  key={social.platform}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-brand-900/10 px-3 py-1 text-xs font-medium text-brand-800 hover:bg-brand-50 hover:text-brand-900"
                >
                  {SOCIAL_LABELS[social.platform]}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <h4 className="mb-4 font-heading text-sm font-semibold text-brand-900">Quick Links</h4>
          <ul className="space-y-2.5 text-sm">
            {quick.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-brand-600">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h4 className="mb-4 font-heading text-sm font-semibold text-brand-900">Our Services</h4>
          <ul className="space-y-2.5 text-sm">
            {(services.length > 0
              ? services.slice(0, 5).map((service) => ({
                  href: "/#services",
                  label: service.name,
                }))
              : mainServices
            ).map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="hover:text-brand-600">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h4 className="mb-4 font-heading text-sm font-semibold text-brand-900">Visit</h4>
          <ul className="space-y-2.5 text-sm text-slate-600">
            {content.clinicName && <li>{content.clinicName}</li>}
            {(content.clinicAddress || content.clinicCity) && (
              <li>{[content.clinicAddress, content.clinicCity].filter(Boolean).join(", ")}</li>
            )}
            {content.clinicPhone && <li>{content.clinicPhone}</li>}
            <li>
              <Link href="/" className="font-medium text-brand-600 hover:text-brand-800">
                {BRAND.name}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-brand-900/8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {BRAND.name}.
          </p>
          {doctor.pmdcNumber ? <p>PMDC {doctor.pmdcNumber}</p> : null}
        </div>
      </div>
    </footer>
  );
}
