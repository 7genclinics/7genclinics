import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  ArrowRight,
  Check,
  ClipboardList,
  Globe2,
  LayoutDashboard,
  Megaphone,
  Stethoscope,
  Users,
  Video,
} from "lucide-react";
import { LandingHeader } from "@/components/public/LandingHeader";
import { LandingFooter } from "@/components/public/LandingFooter";
import { ConeStripe } from "@/components/brand/BrandMark";
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
  "6 Social Media Posts / Month on ApnaClinic social media",
];

const proFeatures = [
  "ApnaClinic Platform Access",
  "Doctor Public Profile",
  "Administrative Dashboard",
  "Receptionist Profile",
  "Customer Management & Communication",
  "Online Store Setup",
  "Online Consultation",
  "15 Social Media Posts / Month for the doctor's profile",
  "1 Week Featured Promotion on ApnaClinic social media",
  "1 AI Promotional Video / Month",
];

const comparisonRows: Array<{
  label: string;
  basic: string | true;
  pro: string | true;
}> = [
  { label: "ApnaClinic Platform", basic: true, pro: true },
  { label: "Public Doctor Profile", basic: true, pro: true },
  { label: "Administrative Dashboard", basic: true, pro: true },
  { label: "Receptionist Profile", basic: true, pro: true },
  { label: "Patient / Customer Management", basic: true, pro: true },
  { label: "Communication Tools", basic: true, pro: true },
  { label: "Online Store Setup", basic: true, pro: true },
  { label: "Online Consultation", basic: true, pro: true },
  { label: "Social Media Content", basic: "6 Posts", pro: "15 Posts" },
  { label: "ApnaClinic Featured Promotion", basic: "—", pro: "1 Week" },
  { label: "AI Promotional Video", basic: "—", pro: "1 / Month" },
];

const valueCards = [
  {
    title: "Manage Your Practice",
    copy: "Handle consultations, patients and administrative activities from one place.",
    icon: LayoutDashboard,
  },
  {
    title: "Build Your Digital Presence",
    copy: "Get a professional public profile and make it easier for patients to discover your services.",
    icon: Globe2,
  },
  {
    title: "Connect With Patients Online",
    copy: "Offer online consultations and communicate with patients more efficiently.",
    icon: Video,
  },
  {
    title: "Marketing Support",
    copy: "Get professionally created social media content to keep your practice active online.",
    icon: Megaphone,
  },
];

const steps = [
  {
    n: "01",
    title: "Select Your Plan",
    copy: "Choose Basic or Pro according to your practice needs.",
  },
  {
    n: "02",
    title: "Complete Your Profile",
    copy: "Our team helps set up your doctor profile and platform access.",
  },
  {
    n: "03",
    title: "Start Managing & Growing",
    copy: "Consult patients, manage your practice and receive your monthly marketing support.",
  },
];

const heroHighlights = [
  { label: "Practice Management", icon: ClipboardList },
  { label: "Online Consultation", icon: Stethoscope },
  { label: "Marketing Support", icon: Megaphone },
  { label: "More Patients", icon: Users },
];

function CellValue({ value }: { value: string | true }) {
  if (value === true) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/10 text-brand-600">
        <Check className="h-4 w-4" strokeWidth={2.5} />
      </span>
    );
  }
  return <span className="text-sm font-medium text-brand-900/80">{value}</span>;
}

export default function DoctorPlansPage() {
  return (
    <div className="min-h-screen bg-[#f7fbfb] text-brand-950">
      <LandingHeader />

      <main>
        <section className="relative isolate min-h-[640px] overflow-hidden bg-[#f3faf9] sm:min-h-[700px] lg:min-h-[760px]">
          <Image
            src="/Smiling%20doctor%20beside%20clinic%20dashboard.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[72%_center] sm:object-right"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#f4fbfb] from-0% via-[#f4fbfb]/95 via-[42%] to-transparent to-[78%] sm:via-[#f4fbfb]/80" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f7fbfb] to-transparent" />

          <div className="relative mx-auto flex min-h-[640px] max-w-6xl flex-col justify-center px-4 py-16 sm:min-h-[700px] sm:px-6 lg:min-h-[760px] lg:py-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-600">
              Plans for doctors
            </p>
            <h1 className="mt-4 max-w-xl font-heading text-[2.5rem] font-bold leading-[1.08] tracking-tight text-brand-950 sm:text-5xl lg:text-[3.35rem]">
              Grow Your Practice with{" "}
              <span className="text-brand-500">{BRAND.name.replace(" ", "")}</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-slate-600 sm:text-lg">
              Manage your patients, consultations, team and online presence — all from one
              platform. Choose the plan that fits how you want to grow.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#plans"
                className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(13,148,136,0.9)] transition-colors hover:bg-brand-600"
              >
                Choose Your Plan
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/register/?role=doctor"
                className="inline-flex items-center gap-2 rounded-full border border-brand-900/12 bg-white/90 px-6 py-3 text-sm font-semibold text-brand-900 backdrop-blur transition-colors hover:border-brand-500/40 hover:text-brand-600"
              >
                Get Started
              </Link>
            </div>

            <div className="mt-10 flex max-w-xl flex-wrap gap-2">
              {heroHighlights.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-2 rounded-full border border-brand-900/8 bg-white/85 px-3 py-1.5 text-xs font-semibold text-brand-900/80 shadow-sm backdrop-blur"
                >
                  <item.icon className="h-3.5 w-3.5 text-brand-500" />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <ConeStripe className="h-1.5" />

        <section id="plans" className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
                Pricing
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Choose the Plan That Fits Your Practice
              </h2>
              <p className="mt-3 text-slate-600">
                Both plans unlock the full Apna Clinic platform. Pro adds stronger marketing support
                for doctors who want more visibility.
              </p>
            </div>

            <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-2">
              <article className="flex flex-col rounded-[1.75rem] border border-brand-900/10 bg-white p-7 shadow-[0_16px_40px_-32px_rgba(18,53,58,0.45)] sm:p-9">
                <p className="text-sm font-semibold text-brand-600">Basic Marketing Plan</p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">PKR 10,000</span>
                  <span className="pb-1.5 text-sm text-slate-500">/ month</span>
                </div>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">
                  A simple solution to take your medical practice online.
                </p>
                <ul className="mt-8 space-y-3.5">
                  {basicFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-brand-950/85">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-brand-600">
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register/?role=doctor"
                  className="mt-10 inline-flex items-center justify-center gap-2 rounded-full border border-brand-500 px-5 py-3 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50"
                >
                  Get Basic Plan
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>

              <article className="relative flex flex-col overflow-hidden rounded-[1.75rem] border border-brand-500 bg-gradient-to-b from-white to-[#f3fbfa] p-7 shadow-[0_24px_60px_-28px_rgba(13,148,136,0.55)] sm:p-9">
                <span className="absolute right-6 top-6 rounded-full bg-brand-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                  Recommended
                </span>
                <p className="text-sm font-semibold text-brand-600">Pro Marketing Plan</p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">PKR 25,000</span>
                  <span className="pb-1.5 text-sm text-slate-500">/ month</span>
                </div>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">
                  Build a stronger digital presence while managing your practice from one place.
                </p>
                <ul className="mt-8 space-y-3.5">
                  {proFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-brand-950/85">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register/?role=doctor"
                  className="mt-10 inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
                >
                  Choose Pro Plan
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            </div>
          </div>
        </section>

        <section className="bg-[#f4f8f8] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
                Compare
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Compare Plans & Features
              </h2>
              <p className="mt-3 text-slate-600">
                See exactly where the PKR 15,000 difference goes — more social posts, featured
                promotion, and an AI video each month.
              </p>
            </div>

            <div className="mt-10 overflow-hidden rounded-[1.75rem] border border-brand-900/8 bg-white shadow-[0_18px_50px_-36px_rgba(18,53,58,0.5)]">
              <div className="grid grid-cols-[1.5fr_0.7fr_0.7fr] border-b border-brand-900/8 bg-[#f7fbfb] px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-900/55 sm:px-8 sm:text-xs">
                <span>Features</span>
                <span className="text-center">Basic · 10K</span>
                <span className="text-center text-brand-600">Pro · 25K</span>
              </div>
              {comparisonRows.map((row, index) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-[1.5fr_0.7fr_0.7fr] items-center px-4 py-4 sm:px-8 ${
                    index % 2 === 0 ? "bg-white" : "bg-[#fbfefd]"
                  }`}
                >
                  <span className="pr-3 text-sm font-medium text-brand-950">{row.label}</span>
                  <div className="flex justify-center">
                    <CellValue value={row.basic} />
                  </div>
                  <div className="flex justify-center rounded-xl bg-brand-500/[0.06] py-2">
                    <CellValue value={row.pro} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
                Why doctors join
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                More Than Just a Platform
              </h2>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {valueCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-brand-900/8 bg-[#f7fbfb] p-6"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600">
                    <card.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-heading text-lg font-semibold tracking-tight">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f4f8f8] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
                How it works
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Get Started in 3 Simple Steps
              </h2>
            </div>

            <ol className="relative mt-12 grid gap-5 lg:grid-cols-3">
              {steps.map((step) => (
                <li
                  key={step.n}
                  className="rounded-[1.5rem] border border-brand-900/8 bg-white p-7 shadow-[0_16px_40px_-32px_rgba(18,53,58,0.45)]"
                >
                  <p className="font-heading text-sm font-bold tracking-[0.18em] text-brand-500">
                    Step {step.n}
                  </p>
                  <h3 className="mt-4 font-heading text-xl font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.copy}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-[#f4f8f8] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="overflow-hidden rounded-[2rem] border border-brand-900/8 bg-white px-6 py-12 shadow-[0_24px_60px_-40px_rgba(18,53,58,0.45)] sm:px-12 sm:py-16">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
                  Get started
                </p>
                <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-brand-950 sm:text-4xl">
                  Ready to Grow Your Practice Online?
                </h2>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                  Join {BRAND.name} and bring practice management, online consultations and digital
                  marketing together.
                </p>
                <Link
                  href="/register/?role=doctor"
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
                >
                  Get Started Today
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="mt-4 text-sm text-slate-500">
                  Basic: PKR 10,000/month · Pro: PKR 25,000/month
                </p>
              </div>
              <div className="mt-10 flex flex-wrap gap-3 text-xs font-semibold text-brand-800">
                <span className="rounded-full border border-brand-900/10 bg-[#f4f8f8] px-3 py-1.5">More Patients</span>
                <span className="rounded-full border border-brand-900/10 bg-[#f4f8f8] px-3 py-1.5">Stronger Presence</span>
                <span className="rounded-full border border-brand-900/10 bg-[#f4f8f8] px-3 py-1.5">A Growing Practice</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
