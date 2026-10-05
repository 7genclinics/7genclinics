import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  ArrowRight,
  Award,
  BarChart3,
  Building2,
  Check,
  ClipboardList,
  Crown,
  Gift,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Monitor,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
  UserRound,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import { LandingHeader } from "@/components/public/LandingHeader";
import { LandingFooter } from "@/components/public/LandingFooter";
import { BRAND } from "@/lib/brand/site";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: `Plans for Doctors · Grow your practice with ${BRAND.name}`,
  description:
    "Choose Basic or Pro marketing plans for Apna Clinic. Manage patients, online consultations, and digital marketing from one platform.",
  path: "/plans/",
});

const basicFeatures = [
  "ApnaClinic Platform Access",
  "Doctor Public Profile",
  "Administrative Dashboard",
  "Receptionist Profile",
  "Customer Management & Communication",
  "Online Store Setup",
  "Online Consultation",
  "6 Social Media Posts / Month",
];

const proFeatures = [
  "ApnaClinic Platform Access",
  "Doctor Public Profile",
  "Administrative Dashboard",
  "Receptionist Profile",
  "Customer Management & Communication",
  "Online Store Setup",
  "Online Consultation",
  "15 Social Media Posts / Month",
  "1 Week Featured Promotion on social media",
  "1 AI Promotional Video / Month",
];

const comparisonRows: Array<{
  label: string;
  icon: LucideIcon;
  basic: string | true;
  pro: string | true;
  proEmphasis?: boolean;
}> = [
  { label: "ApnaClinic Platform Access", icon: Building2, basic: true, pro: true },
  { label: "Doctor Public Profile", icon: UserRound, basic: true, pro: true },
  { label: "Administrative Dashboard", icon: LayoutDashboard, basic: true, pro: true },
  { label: "Receptionist Profile", icon: Users, basic: true, pro: true },
  { label: "Customer Management & Communication", icon: MessageSquare, basic: true, pro: true },
  { label: "Online Store Setup", icon: Store, basic: true, pro: true },
  { label: "Online Consultation", icon: Video, basic: true, pro: true },
  { label: "Social Media Content", icon: Gift, basic: "6 Posts / Month", pro: "15 Posts / Month" },
  {
    label: "ApnaClinic Featured Promotion",
    icon: Award,
    basic: "—",
    pro: "1 Week",
    proEmphasis: true,
  },
  {
    label: "AI Promotional Video",
    icon: Sparkles,
    basic: "—",
    pro: "1 / Month",
    proEmphasis: true,
  },
];

const valueCards = [
  {
    title: "Manage Your Practice",
    copy: "Handle consultations, patients and administrative activities from one place.",
    icon: Monitor,
    cardClass: "bg-sky-50/90",
    iconWrapClass: "bg-sky-100",
    iconClass: "text-sky-600",
  },
  {
    title: "Build Your Digital Presence",
    copy: "Get a professional public profile and make it easier for patients to discover your services.",
    icon: BarChart3,
    cardClass: "bg-emerald-50/90",
    iconWrapClass: "bg-emerald-100",
    iconClass: "text-emerald-600",
  },
  {
    title: "Connect With Patients Online",
    copy: "Offer online consultations and communicate with patients more efficiently.",
    icon: Users,
    cardClass: "bg-rose-50/90",
    iconWrapClass: "bg-rose-100",
    iconClass: "text-rose-500",
  },
  {
    title: "Marketing Support",
    copy: "Get professionally created social media content to keep your practice active and attract more patients.",
    icon: Megaphone,
    cardClass: "bg-amber-50/90",
    iconWrapClass: "bg-amber-100",
    iconClass: "text-amber-600",
  },
];

const steps = [
  {
    title: "Select Your Plan",
    copy: "Choose Basic or Pro according to your practice needs.",
    icon: ClipboardList,
    iconWrapClass: "bg-brand-500/10",
    iconClass: "text-brand-600",
  },
  {
    title: "Complete Your Profile",
    copy: "Our team helps set up your doctor profile and platform access.",
    icon: UserRound,
    iconWrapClass: "bg-sky-100",
    iconClass: "text-sky-600",
  },
  {
    title: "Start Managing & Growing",
    copy: "Consult patients, manage your practice and receive your monthly marketing support.",
    icon: Rocket,
    iconWrapClass: "bg-rose-100",
    iconClass: "text-rose-500",
  },
];

const heroHighlights = [
  { label: "Practice Management", icon: ClipboardList },
  { label: "Online Consultation", icon: LayoutDashboard },
  { label: "Marketing Support", icon: Megaphone },
  { label: "More Patients", icon: Users },
];

function CellValue({
  value,
  emphasis = false,
}: {
  value: string | true;
  emphasis?: boolean;
}) {
  if (value === true) {
    return (
      <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-emerald-500 text-white">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (value === "—") {
    return <span className="text-base font-medium text-slate-300">—</span>;
  }
  return (
    <span
      className={`text-sm text-brand-950/85 ${emphasis ? "font-bold text-brand-950" : "font-medium"}`}
    >
      {value}
    </span>
  );
}

export default function DoctorPlansPage() {
  return (
    <div className="min-h-screen bg-[#f7fbfb] text-brand-950">
      <LandingHeader />

      <main>
        <section className="relative overflow-x-hidden border-b border-slate-200/80 bg-[#eaf4f2]">
          <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 pb-12 pt-5 sm:gap-10 sm:px-6 sm:pb-14 sm:pt-12 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-x-10 lg:pb-16 lg:pt-28 xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] xl:gap-x-14">
            <div className="relative z-10 min-w-0 max-w-xl lg:max-w-none">
              <span className="inline-flex rounded-full bg-brand-500/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                Plans for Doctors
              </span>

              <h1 className="mt-4 font-heading text-[2.15rem] font-bold leading-[1.08] tracking-tight text-brand-950 sm:mt-5 sm:text-5xl lg:text-[3.15rem]">
                Grow Your Practice with{" "}
                <span className="text-brand-500">{BRAND.name.replace(" ", "")}</span>
              </h1>

              <p className="mt-4 text-base font-medium leading-relaxed text-brand-900/85 sm:mt-5 sm:text-xl">
                Manage your patients, consultations, team and online presence — all from one
                platform.
              </p>
              <p className="mt-2.5 max-w-md text-sm leading-relaxed text-slate-500 sm:mt-3 sm:text-base">
                Choose the plan that fits your practice and let {BRAND.name.replace(" ", "")} help
                you manage and grow digitally.
              </p>

              {/* Mobile: stats first, CTA below. Desktop: CTA then stats. */}
              <div className="mt-7 flex flex-col sm:mt-8">
                <div className="order-1 grid grid-cols-4 gap-1.5 sm:order-2 sm:mt-10 sm:gap-x-4">
                  {heroHighlights.map((item) => (
                    <div key={item.label} className="flex min-w-0 flex-col items-center gap-1.5 text-center sm:gap-2">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-500/30 bg-white text-brand-600 shadow-sm sm:h-12 sm:w-12">
                        <item.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </span>
                      <span className="max-w-[4.75rem] text-[10px] font-semibold leading-snug text-brand-900/75 sm:max-w-[7.5rem] sm:text-[11px]">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="order-2 mt-7 sm:order-1 sm:mt-0">
                  <Link
                    href="#plans"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_14px_30px_-14px_rgba(13,148,136,0.95)] transition-transform hover:bg-brand-600 hover:scale-[1.02] sm:w-auto"
                  >
                    Choose Your Plan
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="relative min-w-0 justify-self-stretch lg:justify-self-end lg:pl-2 xl:pl-0">
              <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-[8px] lg:mx-0 lg:ml-auto lg:max-w-[min(100%,640px)] lg:-mr-1 xl:max-w-[720px] xl:-mr-4 2xl:-mr-8">
                <Image
                  src="/Smiling%20doctor%20beside%20clinic%20dashboard.png"
                  alt="Doctor with Apna Clinic dashboard and online consultation"
                  width={1774}
                  height={887}
                  priority
                  sizes="(max-width: 1024px) 100vw, 720px"
                  className="h-auto w-full object-contain"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="plans" className="bg-[#f7fbfb] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex rounded-full bg-brand-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
                Our Plans
              </span>
              <h2 className="mt-5 font-heading text-3xl font-bold tracking-tight text-brand-950 sm:text-4xl">
                Choose the Plan That Fits Your Practice
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-500 sm:text-base">
                Get the complete ApnaClinic platform along with professional marketing support to
                grow your online presence.
              </p>
            </div>

            <div className="mt-14 grid items-stretch gap-8 lg:grid-cols-2 lg:gap-10">
              <article className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-8 shadow-[0_4px_24px_-8px_rgba(18,53,58,0.12)] sm:p-9">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/10 text-brand-600">
                  <Send className="h-6 w-6" />
                </span>
                <h3 className="mt-6 font-heading text-xl font-bold tracking-tight text-brand-950">
                  Basic Marketing Plan
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  A simple solution to take your medical practice online.
                </p>
                <div className="mt-6 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                  <span className="text-sm font-medium text-slate-500">PKR</span>
                  <span className="font-heading text-4xl font-bold tracking-tight text-brand-950 sm:text-[2.75rem]">
                    10,000
                  </span>
                  <span className="text-sm font-medium text-slate-500">/ month</span>
                </div>
                <ul className="mt-8 flex-1 space-y-3.5 border-t border-slate-100 pt-8">
                  {basicFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-brand-950/90">
                      <span className="mt-0.5 inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register/?role=doctor"
                  className="mt-10 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-brand-500 bg-white py-3.5 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50"
                >
                  Get Basic Plan
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>

              <article className="relative flex flex-col rounded-2xl border-2 border-brand-500 bg-white p-8 shadow-[0_8px_32px_-12px_rgba(13,148,136,0.35)] sm:p-9">
                <span className="absolute -top-px right-6 inline-flex items-center gap-1.5 rounded-b-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm">
                  <Crown className="h-3.5 w-3.5 text-amber-300" fill="currentColor" />
                  Recommended
                </span>
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-500">
                  <Rocket className="h-6 w-6" />
                </span>
                <h3 className="mt-6 font-heading text-xl font-bold tracking-tight text-brand-950">
                  Pro Marketing Plan
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Build a stronger digital presence while managing your practice from one place.
                </p>
                <div className="mt-6 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                  <span className="text-sm font-medium text-slate-500">PKR</span>
                  <span className="font-heading text-4xl font-bold tracking-tight text-brand-500 sm:text-[2.75rem]">
                    25,000
                  </span>
                  <span className="text-sm font-medium text-slate-500">/ month</span>
                </div>
                <ul className="mt-8 flex-1 space-y-3.5 border-t border-slate-100 pt-8">
                  {proFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-brand-950/90">
                      <span className="mt-0.5 inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register/?role=doctor"
                  className="mt-10 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
                >
                  Choose Pro Plan
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            </div>
          </div>
        </section>

        <section className="bg-[#eef6fc] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex rounded-full bg-brand-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
                Plan Comparison
              </span>
              <h2 className="mt-5 font-heading text-3xl font-bold tracking-tight text-brand-950 sm:text-4xl">
                Compare Plans & Features
              </h2>
            </div>

            <div className="mt-12 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_28px_-10px_rgba(18,53,58,0.14)]">
              <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.55fr)_minmax(0,0.55fr)] border-b border-slate-100">
                <div className="px-5 py-5 sm:px-8 sm:py-6">
                  <span className="text-sm font-bold text-brand-950">Features</span>
                </div>
                <div className="flex flex-col items-center justify-center border-l border-slate-100 px-3 py-5 text-center sm:px-4 sm:py-6">
                  <span className="text-sm font-bold text-brand-950">Basic</span>
                  <span className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">
                    PKR 10,000
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center border-l border-slate-100 bg-[#ecfbf6] px-3 py-5 text-center sm:px-4 sm:py-6">
                  <span className="text-sm font-bold text-brand-500">Pro</span>
                  <span className="mt-1 text-xs font-bold text-brand-500 sm:text-sm">PKR 25,000</span>
                </div>
              </div>

              {comparisonRows.map((row, index) => {
                const Icon = row.icon;
                return (
                  <div
                    key={row.label}
                    className={`grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.55fr)_minmax(0,0.55fr)] items-center border-b border-slate-100 last:border-b-0 ${
                      index % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 px-5 py-4 sm:gap-4 sm:px-8 sm:py-5">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                      </span>
                      <span className="text-sm font-medium text-brand-950/90">{row.label}</span>
                    </div>
                    <div className="flex justify-center border-l border-slate-100 px-3 py-4 sm:px-4 sm:py-5">
                      <CellValue value={row.basic} />
                    </div>
                    <div className="flex justify-center border-l border-slate-100 bg-[#ecfbf6] px-3 py-4 sm:px-4 sm:py-5">
                      <CellValue value={row.pro} emphasis={row.proEmphasis} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex rounded-full bg-brand-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
                Why Choose ApnaClinic
              </span>
              <h2 className="mt-5 font-heading text-3xl font-bold tracking-tight text-brand-950 sm:text-4xl">
                More Than Just a Platform
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-500 sm:text-base">
                We help you manage your practice and grow your online presence so you can focus on
                what matters most — your patients.
              </p>
            </div>

            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {valueCards.map((card) => (
                <div
                  key={card.title}
                  className={`rounded-2xl p-6 sm:p-7 ${card.cardClass}`}
                >
                  <span
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${card.iconWrapClass}`}
                  >
                    <card.icon className={`h-5 w-5 ${card.iconClass}`} strokeWidth={2} />
                  </span>
                  <h3 className="mt-5 font-heading text-base font-bold tracking-tight text-brand-950 sm:text-lg">
                    {card.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{card.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex rounded-full bg-brand-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
                How It Works
              </span>
              <h2 className="mt-5 font-heading text-3xl font-bold tracking-tight text-brand-950 sm:text-4xl">
                Get Started in 3 Simple Steps
              </h2>
            </div>

            <div className="mt-14 flex flex-col items-center gap-12 lg:flex-row lg:items-start lg:justify-center lg:gap-4 xl:gap-8">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="contents lg:flex lg:items-start lg:gap-4 xl:gap-8">
                    <div className="flex max-w-sm flex-col items-center text-center lg:max-w-[17rem] lg:flex-1">
                      <span
                        className={`inline-flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full sm:h-20 sm:w-20 ${step.iconWrapClass}`}
                      >
                        <Icon className={`h-7 w-7 sm:h-8 sm:w-8 ${step.iconClass}`} strokeWidth={2} />
                      </span>
                      <h3 className="mt-5 font-heading text-lg font-bold tracking-tight text-brand-950">
                        {index + 1}. {step.title}
                      </h3>
                      <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{step.copy}</p>
                    </div>
                    {index < steps.length - 1 ? (
                      <div
                        aria-hidden
                        className="hidden shrink-0 items-center self-center pt-8 lg:flex lg:pt-10"
                      >
                        <ArrowRight className="h-7 w-7 text-rose-200 xl:h-8 xl:w-8" strokeWidth={2} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#e8f5f1] py-16 sm:py-20 lg:py-0">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-24 top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full bg-[#cfe9e3]/70 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute left-[18%] top-[8%] h-64 w-64 rounded-full bg-[#d7efe9]/80"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 bottom-[-20%] h-[22rem] w-[22rem] rounded-full bg-[#cfe9e3]/60"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute right-[8%] top-[-10%] h-48 w-48 rounded-full bg-[#d7efe9]/70"
          />

          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-8 lg:px-6">
            <div className="relative mx-auto w-full max-w-none sm:max-w-md lg:mx-0 lg:max-w-none lg:self-end">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[8px] sm:aspect-[3/4] lg:aspect-auto lg:h-[28rem] xl:h-[32rem]">
                <Image
                  src="/doc_female_portrait.jpg"
                  alt="Doctor ready to grow their practice with ApnaClinic"
                  fill
                  sizes="(max-width: 1024px) 90vw, 42vw"
                  className="object-cover object-[center_top] scale-105"
                  priority={false}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#e8f5f1] to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#e8f5f1]/80 to-transparent max-lg:hidden" />
              </div>
            </div>

            <div className="relative pb-4 pt-2 lg:py-20 xl:py-24">
              <h2 className="font-heading text-3xl font-bold tracking-tight text-brand-950 sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
                Ready to Grow Your Practice Online?
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-600 sm:text-base">
                Join ApnaClinic and bring practice management, online consultations and digital
                marketing together.
              </p>

              <Link
                href="/register/?role=doctor"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#1c855a] px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#16734d]"
              >
                Get Started Today
                <ArrowRight className="h-4 w-4" />
              </Link>

              <p className="mt-4 text-sm font-semibold text-brand-800">
                Basic: PKR 10,000/month &nbsp;·&nbsp; Pro: PKR 25,000/month
              </p>

              <div className="mt-10 flex flex-wrap gap-8 sm:gap-10">
                {[
                  { label: "More Patients", icon: Users },
                  { label: "Stronger Presence", icon: BarChart3 },
                  { label: "A Growing Practice", icon: ShieldCheck },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col items-center gap-2.5 text-center">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/80 text-brand-600 shadow-sm ring-1 ring-brand-900/5">
                      <item.icon className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <span className="text-xs font-semibold text-brand-950 sm:text-sm">{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Decorative plant accent (far right), matching the mockup */}
              <div
                aria-hidden
                className="pointer-events-none absolute -right-6 bottom-0 hidden h-48 w-36 opacity-90 xl:block"
              >
                <svg viewBox="0 0 140 200" fill="none" className="h-full w-full">
                  <ellipse cx="70" cy="188" rx="28" ry="8" fill="#c5ddd4" />
                  <path
                    d="M70 180c0-40 8-70 22-110 6 28 4 55-4 82-4 14-10 24-18 28z"
                    fill="#2f9e6e"
                  />
                  <path
                    d="M70 180c0-48-10-85-28-120-2 32 2 62 12 90 6 16 12 26 16 30z"
                    fill="#1c855a"
                  />
                  <path
                    d="M72 170c12-36 38-58 58-72-18 22-28 48-34 78-2 12-8 20-24-6z"
                    fill="#3cb87a"
                  />
                  <path
                    d="M68 165c-14-30-40-48-60-58 16 18 26 42 32 70 3 12 10 18 28-12z"
                    fill="#248f5f"
                  />
                  <path
                    d="M70 140c6-28 24-48 40-58-10 16-16 34-18 54-1 10-6 14-22 4z"
                    fill="#4ec98a"
                  />
                </svg>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
