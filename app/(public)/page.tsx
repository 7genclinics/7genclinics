import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { LandingHeader } from "@/components/public/LandingHeader";
import { LandingFooter } from "@/components/public/LandingFooter";
import { DoctorsBrowse } from "@/components/public/DoctorsBrowse";
import { DoctorSearchHero } from "@/components/public/DoctorSearchHero";
import { ConeStripe } from "@/components/brand/BrandMark";
import { getApprovedDoctorsServer } from "@/lib/public/doctors";
import { BRAND } from "@/lib/brand/site";
import { CONE_COLORS } from "@/lib/brand/colors";

const steps = [
  {
    n: "01",
    title: "Find a doctor",
    copy: "Search by city, specialty, or name. PMDC-verified profiles only.",
  },
  {
    n: "02",
    title: "Choose the visit",
    copy: "Book video or chat from home, or reserve a clinic slot.",
  },
  {
    n: "03",
    title: "Arrive or join",
    copy: "Check in at reception for a token, or enter your private room.",
  },
  {
    n: "04",
    title: "Consult & settle",
    copy: "Notes and prescriptions follow. Pay online ahead, or at the desk after.",
  },
];

const faqs = [
  {
    q: "Is Wasl only online?",
    a: "No. Wasl is a hybrid clinic: video and chat from home, or in-person care with reception check-in, queue tokens, and desk billing.",
  },
  {
    q: "Do I need an account to browse?",
    a: "No. Explore verified doctors without signing up. You’ll need an account when you book a slot.",
  },
  {
    q: "Can I walk in without booking?",
    a: "Yes. Reception can register walk-in patients, assign a doctor, and place you in today’s queue.",
  },
  {
    q: "How do payments work?",
    a: "Online bookings stay prepaid. Unpaid in-clinic visits settle at reception after the consult — never double-charged if you already paid online.",
  },
];

export default async function HomePage() {
  let doctors: Awaited<ReturnType<typeof getApprovedDoctorsServer>> = [];
  try {
    doctors = await getApprovedDoctorsServer();
  } catch {
    doctors = [];
  }

  return (
    <div className="min-h-screen bg-white text-brand-900">
      <LandingHeader overlay />

      <main>
        <section className="relative isolate min-h-[100svh] overflow-hidden text-white">
          <Image
            src="/wellness_concept.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="animate-wasl-soft-pan object-cover object-[58%_center]"
          />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-brand-950/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/40 to-transparent" />

          <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-4 pb-10 pt-28 sm:px-6 sm:pb-14 lg:pb-16">
            <p className="animate-wasl-letter font-display text-[clamp(5.75rem,22vw,9.75rem)] font-extrabold leading-[0.8] tracking-[-0.06em]">
              {BRAND.shortName}
            </p>
            <h1 className="animate-wasl-fade-up-delay mt-5 max-w-lg font-display text-2xl font-semibold leading-snug tracking-tight sm:text-3xl lg:text-[2.15rem]">
              See a doctor today.
            </h1>
            <p className="animate-wasl-fade-up-delay-2 mt-3 max-w-md text-base leading-relaxed text-white/75 sm:text-lg">
              Video from home, or walk into the clinic.
            </p>
            <div className="animate-wasl-fade-up-delay-2 mt-8 max-w-4xl">
              <DoctorSearchHero variant="hero" doctorCount={doctors.length} doctors={doctors} />
            </div>
          </div>
        </section>

        <ConeStripe className="h-1.5" />

        <section id="care" className="grid min-h-[min(78vh,720px)] lg:grid-cols-2">
          <Link
            href="/doctors"
            className="group relative isolate min-h-[420px] overflow-hidden text-white"
          >
            <Image
              src="/doc_female_portrait.png"
              alt="Doctor available for online consultation"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-950/90 via-brand-950/35 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-8 sm:p-10">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/60">
                Online
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Consult from anywhere
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/75 sm:text-base">
                Book video or chat, pay ahead, join a private room — evenings included.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium">
                Book a video visit
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>

          <Link
            href="/doctors"
            className="group relative isolate min-h-[420px] overflow-hidden text-white"
          >
            <Image
              src="/patient-login-page.jpg"
              alt="Patient receiving care in clinic"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-950/90 via-brand-950/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-8 sm:p-10">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/60">
                In clinic
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Walk in. Get a token.
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/75 sm:text-base">
                Reception checks you in. Doctors call the next patient. Settle at the desk if needed.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium">
                Reserve a clinic slot
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        </section>

        <section id="visit" className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              How a visit works
            </h2>
            <p className="mt-3 max-w-lg text-slate-600">
              From first search to completed consult — online or at the desk.
            </p>

            <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              {steps.map((step, i) => (
                <li key={step.n} className="relative">
                  <p
                    className="font-display text-4xl font-extrabold tracking-tight"
                    style={{
                      color: [
                        CONE_COLORS.teal,
                        CONE_COLORS.blue,
                        CONE_COLORS.tealMuted,
                        CONE_COLORS.blueDeep,
                      ][i],
                    }}
                  >
                    {step.n}
                  </p>
                  <h3 className="mt-4 font-display text-xl font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.copy}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {doctors.length > 0 && (
          <section className="border-t border-brand-900/8 bg-[#f4f8f8] py-20 sm:py-24">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <Suspense fallback={null}>
                <DoctorsBrowse
                  initialDoctors={doctors}
                  title="Doctors ready today"
                  subtitle="Book video, chat, or an in-clinic visit."
                  limit={3}
                  layout="grid"
                  showFilters={false}
                />
              </Suspense>
            </div>
          </section>
        )}

        <section id="faq" className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Before you book
            </h2>
            <p className="mt-3 max-w-lg text-slate-600">
              Hybrid care through {BRAND.name} — online and in the clinic.
            </p>

            <div className="mt-12 max-w-3xl divide-y divide-brand-900/10">
              {faqs.map((faq, i) => (
                <details key={faq.q} className="group py-1">
                  <summary className="flex cursor-pointer list-none items-baseline gap-6 py-5 marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="font-display w-8 shrink-0 text-sm font-semibold text-brand-400">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 font-display text-lg font-semibold tracking-tight text-brand-900">
                      {faq.q}
                    </span>
                    <span className="text-brand-400 transition-transform duration-300 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="pb-5 pl-14 text-sm leading-relaxed text-slate-600">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-r from-brand-950 via-brand-700 to-brand-500 py-16 text-white sm:py-20">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-4 sm:flex-row sm:items-end sm:px-6">
            <div>
              <p className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
                Ready when you are
              </p>
              <p className="mt-3 max-w-md text-white/80">
                Book a secure consult, or walk in for same-day care.
              </p>
            </div>
            <Link
              href="/doctors"
              className="inline-flex items-center gap-2 border border-white/30 px-6 py-3 text-sm font-medium transition-colors hover:bg-white hover:text-brand-800"
            >
              Find a doctor
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
