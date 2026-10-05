import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  ArrowRight,
  Check,
  ClipboardList,
  Globe2,
  Headphones,
  LayoutDashboard,
  Megaphone,
  Stethoscope,
  Users,
  Video,
} from "lucide-react";
import { LandingHeader } from "@/components/public/LandingHeader";
import { LandingFooter } from "@/components/public/LandingFooter";
import { BrandMark, ConeStripe } from "@/components/brand/BrandMark";
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
        <section className="relative overflow-hidden border-b border-brand-900/6 bg-gradient-to-br from-[#eef7f6] via-white to-[#f4f8fb]">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-brand-400/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-brand-500/8 blur-3xl"
          />

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-28 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-20 lg:pt-32">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-brand-900/8 bg-white/80 px-3 py-1.5 shadow-sm backdrop-blur">
                <BrandMark size="sm" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                  Plans for Doctors
                </span>
              </div>

              <h1 className="max-w-xl font-heading text-[2.35rem] font-bold leading-[1.12] tracking-tight text-brand-950 sm:text-5xl">
                Grow Your Practice with{" "}
                <span className="text-brand-500">{BRAND.name.replace(" ", "")}</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
                Manage your patients, consultations, team and online presence — all from one
                platform. Choose the plan that fits how you want to grow.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="#plans"
                  className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
                >
                  Choose Your Plan
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/register/?role=doctor"
                  className="inline-flex items-center gap-2 rounded-full border border-brand-900/12 bg-white px-6 py-3 text-sm font-semibold text-brand-900 transition-colors hover:border-brand-500/40 hover:text-brand-600"
                >
                  Get Started
                </Link>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {heroHighlights.map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col items-start gap-2 rounded-2xl border border-brand-900/6 bg-white/70 px-3 py-3"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/10 text-brand-600">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-semibold leading-snug text-brand-900/80">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-brand-900/8 bg-white shadow-[0_24px_80px_-28px_rgba(13,82,88,0.35)]">
                <Image
                  src="/doc_male_portrait.jpg"
                  alt="Doctor using Apna Clinic to grow their practice"
                  fill
                  priority
                  sizes="(max-width: 1024px) 90vw, 480px"
                  className="object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-950/55 via-transparent to-transparent" />

                <div className="absolute left-4 top-5 hidden w-[52%] overflow-hidden rounded-2xl border border-white/50 bg-white/95 shadow-xl backdrop-blur sm:block">
                  <div className="border-b border-brand-900/6 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-500">
                      Dashboard
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-brand-950">Welcome, Doctor</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-3">
                    {[
                      { label: "Patients", value: "128" },
                      { label: "This week", value: "14" },
                      { label: "Online", value: "Ready" },
                      { label: "Marketing", value: "Active" },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-xl bg-[#f4f8f8] px-2.5 py-2">
                        <p className="text-[10px] text-slate-500">{stat.label}</p>
                        <p className="text-sm font-bold text-brand-900">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="absolute bottom-5 right-4 w-[46%] overflow-hidden rounded-2xl border border-white/60 bg-white shadow-xl">
                  <div className="relative aspect-[4/5]">
                    <Image
                      src="/online_meeting.jpg"
                      alt="Online consultation on Apna Clinic"
                      fill
                      sizes="180px"
                      className="object-cover"
                    />
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-[10px] font-semibold text-brand-500">Online Consultation</p>
                    <p className="text-xs font-medium text-brand-950">Join from home</p>
                  </div>
                </div>
              </div>
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

            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              <article className="flex flex-col rounded-3xl border border-brand-900/10 bg-[#f7fbfb] p-7 sm:p-8">
                <p className="text-sm font-semibold text-brand-600">Basic Marketing Plan</p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="font-heading text-4xl font-bold tracking-tight">PKR 10,000</span>
                  <span className="pb-1 text-sm text-slate-500">/ month</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  A simple solution to take your medical practice online.
                </p>
                <ul className="mt-7 space-y-3">
                  {basicFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-brand-950/85">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" strokeWidth={2.5} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register/?role=doctor"
                  className="mt-8 inline-flex items-center justify-center gap-2 rounded-full border border-brand-500 bg-white px-5 py-3 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50"
                >
                  Get Basic Plan
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>

              <article className="relative flex flex-col overflow-hidden rounded-3xl border-2 border-brand-500 bg-white p-7 shadow-[0_20px_50px_-30px_rgba(13,148,136,0.55)] sm:p-8">
                <span className="absolute right-5 top-5 rounded-full bg-brand-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                  Recommended
                </span>
                <p className="text-sm font-semibold text-brand-600">Pro Marketing Plan</p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="font-heading text-4xl font-bold tracking-tight">PKR 25,000</span>
                  <span className="pb-1 text-sm text-slate-500">/ month</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Build a stronger digital presence while managing your practice from one place.
                </p>
                <ul className="mt-7 space-y-3">
                  {proFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-brand-950/85">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" strokeWidth={2.5} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register/?role=doctor"
                  className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
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

            <div className="mt-10 overflow-hidden rounded-3xl border border-brand-900/8 bg-white shadow-sm">
              <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr] border-b border-brand-900/8 bg-[#eef6f6] px-4 py-4 text-xs font-semibold uppercase tracking-wide text-brand-900/70 sm:px-6 sm:text-sm">
                <span>Features</span>
                <span className="text-center">Basic · 10K</span>
                <span className="text-center text-brand-600">Pro · 25K</span>
              </div>
              {comparisonRows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[1.4fr_0.8fr_0.8fr] items-center border-b border-brand-900/6 px-4 py-4 last:border-b-0 sm:px-6"
                >
                  <span className="pr-3 text-sm font-medium text-brand-950">{row.label}</span>
                  <div className="flex justify-center">
                    <CellValue value={row.basic} />
                  </div>
                  <div className="flex justify-center">
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

            <ol className="mt-12 grid gap-5 lg:grid-cols-3">
              {steps.map((step) => (
                <li
                  key={step.n}
                  className="rounded-2xl border border-brand-900/8 bg-white p-6 shadow-sm"
                >
                  <p className="font-heading text-3xl font-extrabold tracking-tight text-brand-500">
                    {step.n}
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

        <section className="relative overflow-hidden bg-white py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
            <div className="relative min-h-[320px] overflow-hidden rounded-3xl border border-brand-900/8">
              <Image
                src="/doc_female_portrait.jpg"
                alt="Doctor ready to grow their practice on Apna Clinic"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-top"
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
                Ready when you are
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to Grow Your Practice Online?
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
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
              <div className="mt-8 flex flex-wrap gap-4 text-xs font-semibold text-brand-700">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> More Patients
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe2 className="h-3.5 w-3.5" /> Stronger Presence
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Headphones className="h-3.5 w-3.5" /> A Growing Practice
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
