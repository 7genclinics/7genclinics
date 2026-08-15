import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  MessageSquare,
  Stethoscope,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

const services = [
  {
    title: "Video consultation",
    subtitle: "From home",
    description: "Secure online visit with a verified doctor",
    icon: Video,
    href: "/doctors?availableNow=true",
    iconClassName: "text-brand-500",
  },
  {
    title: "Clinic appointment",
    subtitle: "In person",
    description: "Book a slot or walk in for same-day care",
    icon: Building2,
    href: "/doctors",
    iconClassName: "text-brand-700",
  },
  {
    title: "Chat consultation",
    subtitle: "Message-based",
    description: "Flexible text sessions when video isn’t needed",
    icon: MessageSquare,
    href: "/doctors?specialty=Psychologist",
    iconClassName: "text-brand-600",
  },
];

export function ServiceQuickLinks({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-6 sm:grid-cols-3", className)}>
      {services.map((service) => {
        const Icon = service.icon;
        return (
          <Link
            key={service.title}
            href={service.href}
            className="group block border-b border-brand-100 pb-5 transition-colors hover:border-brand-300"
          >
            <div className="flex items-start justify-between">
              <Icon className={cn("h-7 w-7", service.iconClassName)} strokeWidth={1.75} />
              <ArrowUpRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-brand-500" />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold text-slate-900">
              {service.title}
            </h3>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-brand-600">
              {service.subtitle}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{service.description}</p>
          </Link>
        );
      })}
    </div>
  );
}

export function SpecialtyQuickLinks() {
  const links = [
    { label: "Psychiatrist", href: "/doctors?specialty=Psychiatrist" },
    { label: "Psychologist", href: "/doctors?specialty=Psychologist" },
    { label: "General Physician", href: "/doctors?specialty=General%20Physician" },
    { label: "Neurologist", href: "/doctors?specialty=Neurologist" },
    { label: "Nutritionist", href: "/doctors?specialty=Nutritionist" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Stethoscope className="h-4 w-4 text-slate-400" />
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          className="border-b border-transparent px-1 py-1 text-xs font-semibold text-slate-600 transition-colors hover:border-brand-400 hover:text-brand-700"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
