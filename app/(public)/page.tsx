import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarCheck,
  ClipboardList,
  Clock,
  FileText,
  HeartPulse,
  MapPin,
  MessageSquare,
  Phone,
  Receipt,
  ShieldCheck,
  Stethoscope,
  Ticket,
  Video,
  Wallet,
} from "lucide-react";
import { LandingHeader } from "@/components/public/LandingHeader";
import { LandingFooter } from "@/components/public/LandingFooter";
import { DoctorsBrowse } from "@/components/public/DoctorsBrowse";
import { DoctorSearchHero } from "@/components/public/DoctorSearchHero";
import { ConditionBrowse } from "@/components/public/ConditionBrowse";
import { TestimonialsCarousel } from "@/components/public/TestimonialsCarousel";
import { ConeStripe } from "@/components/brand/BrandMark";
import { getApprovedDoctorsServer } from "@/lib/public/doctors";
import { MENTAL_SYMPTOMS } from "@/lib/public/catalog";
import { BRAND } from "@/lib/brand/site";
import { CONE_COLORS } from "@/lib/brand/colors";

const stats = [
  { value: "PMDC", label: "Verified doctors only" },
  { value: "2 ways", label: "Video from home or walk in" },
  { value: "Same day", label: "Tokens & desk billing" },
  { value: "Nationwide", label: BRAND.citiesLabel.split(" · ").slice(0, 3).join(" · ") },
];

const services = [
  {
    title: "Video consultation",
    copy: "Join a private room from your phone or laptop. Pay ahead, evenings included.",
    href: "/doctors",
    icon: Video,
    accent: CONE_COLORS.teal,
  },
  {
    title: "Chat with a doctor",
    copy: "Message-based care when you need advice without a live video call.",
    href: "/doctors",
    icon: MessageSquare,
    accent: CONE_COLORS.tealMuted,
  },
  {
    title: "Clinic appointment",
    copy: "Reserve an in-person slot. Reception checks you in and issues a queue token.",
    href: "/doctors",
    icon: Building2,
    accent: CONE_COLORS.blue,
  },
  {
    title: "Walk-in visit",
    copy: "No booking needed. Register at the desk, wait your turn, settle after the consult.",
    href: "/register",
    icon: Ticket,
    accent: CONE_COLORS.blueDeep,
  },
];

const steps = [
  {
    n: "01",
    title: "Find a doctor",
    copy: "Search by city, specialty, or name. Only PMDC-verified profiles are listed.",
  },
  {
    n: "02",
    title: "Choose the visit",
    copy: "Book video or chat from home, reserve a clinic slot, or walk in the same day.",
  },
  {
    n: "03",
    title: "Arrive or join",
    copy: "Check in at reception for a token, or enter your private video room on time.",
  },
  {
    n: "04",
    title: "Consult & settle",
    copy: "Notes and prescriptions follow. Pay online ahead, or at the desk after — never twice.",
  },
];

const reasons = [
  {
    icon: ShieldCheck,
    title: "Verified clinicians",
    copy: "Every listed doctor is reviewed before they can take patients.",
  },
  {
    icon: HeartPulse,
    title: "One record, both doors",
    copy: "Online booking and clinic floor share the same appointment — no duplicate files.",
  },
  {
    icon: Ticket,
    title: "Live queue tokens",
    copy: "Reception issues a number. Doctors call the next patient from their queue.",
  },
  {
    icon: FileText,
    title: "Prescriptions that travel",
    copy: "Print or download your Rx after video, chat, or an in-person consult.",
  },
  {
    icon: Wallet,
    title: "Clear payments",
    copy: "Prepaid online visits. Walk-ins settle at reception. No double charge.",
  },
  {
    icon: ClipboardList,
    title: "Self-assessment first",
    copy: "Not sure who to see? Start with a short screening, then book the right specialty.",
  },
];

const clinicFloor = [
  {
    icon: CalendarCheck,
    title: "Check in",
    copy: "Show your booking or register as a walk-in. Reception confirms your details.",
  },
  {
    icon: Ticket,
    title: "Get a token",
    copy: "You join today’s waiting list. The screen and desk both know your place.",
  },
  {
    icon: Stethoscope,
    title: "See the doctor",
    copy: "When your number is called, you go in. Notes, diagnosis, and Rx are recorded.",
  },
  {
    icon: Receipt,
    title: "Pay at the desk",
    copy: "If you did not prepay online, reception collects the fee and can print a receipt.",
  },
];

const testimonials = [
  {
    quote:
      "I booked a video slot after work, paid online, and had a prescription the same evening. No travel across Lahore.",
    name: "Ayesha R.",
    city: "Lahore",
    rating: 5,
    role: "Video visit",
  },
  {
    quote:
      "Walked in without an appointment. Reception gave me a token, I waited maybe twenty minutes, and settled at the desk after.",
    name: "Hamza K.",
    city: "Karachi",
    rating: 5,
    role: "Walk-in",
  },
  {
    quote:
      "The doctor already had my previous online notes when I came to the clinic. Felt like one place, not two systems.",
    name: "Sana M.",
    city: "Islamabad",
    rating: 5,
    role: "Follow-up",
  },
  {
    quote:
      "Chat consult for my sleep issues was straightforward. Later I reserved an in-clinic slot with the same psychiatrist.",
    name: "Bilal T.",
    city: "Multan",
    rating: 5,
    role: "Chat + clinic",
  },
  {
    quote:
      "Clear fees, printed receipt, and the queue actually moved. That is rare in a busy clinic.",
    name: "Nadia F.",
    city: "Faisalabad",
    rating: 5,
    role: "In-clinic",
  },
  {
    quote:
      "Used the self-assessment, then booked a psychologist. The search filters by city saved me a lot of guesswork.",
    name: "Omar J.",
    city: "Peshawar",
    rating: 5,
    role: "Assessment",
  },
];

const faqs = [
  {
    q: "Is Wasl only online?",
    a: "No. Wasl is a hybrid clinic: video and chat from home, or in-person care with reception check-in, queue tokens, and desk billing.",
  },
  {
    q: "Do I need an account to browse?",
    a: "No. Explore verified doctors without signing up. You will need an account when you book a slot or complete a walk-in registration.",
  },
  {
    q: "Can I walk in without booking?",
    a: "Yes. Reception can register walk-in patients, assign a doctor, and place you in today’s queue.",
  },
  {
    q: "How do payments work?",
    a: "Online bookings stay prepaid. Unpaid in-clinic visits settle at reception after the consult — never double-charged if you already paid online.",
  },
  {
    q: "Will the doctor see my past visits?",
    a: "Yes. Online and clinic visits share one record — notes, prescriptions, and previous appointments stay with your profile.",
  },
  {
    q: "What if I miss my slot?",
    a: "Online sessions can expire if you do not join. For clinic bookings, reception may mark a no-show. You can book again or walk in if the doctor still has capacity.",
  },
  {
    q: "Are prescriptions available after a video visit?",
    a: "Yes. After the consult, you can view, print, or download your prescription from your patient account.",
  },
  {
    q: "Which cities are covered?",
    a: `${BRAND.citiesLabel}. Video and chat are available nationwide; in-clinic care depends on the doctor’s clinic location.`,
  },
];

const hours = [
  { day: "Monday – Saturday", time: "9:00 AM – 9:00 PM" },
  { day: "Sunday", time: "10:00 AM – 6:00 PM" },
  { day: "Video & chat", time: "Until 11:00 PM" },
];

export default async function HomePage() {
  let doctors: Awaited<ReturnType<typeof getApprovedDoctorsServer>> = [];
  try {
    doctors = await getApprovedDoctorsServer();
  } catch {
    doctors = [];
  }

  return (
    <div className="landing-page min-h-screen bg-white text-brand-900">
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
          <div className="absolute inset-0 bg-gradient-to-r from-brand-950/92 via-brand-950/55 to-brand-950/20" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-brand-950 to-transparent" />

          <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-4 pb-10 pt-28 sm:px-6 sm:pb-14 lg:justify-center lg:pb-20 lg:pt-32">
            <p className="animate-wasl-fade-up text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-300">
              {BRAND.name} · Hybrid clinic
            </p>
            <h1 className="animate-wasl-fade-up-delay mt-4 max-w-2xl font-heading text-[2.35rem] font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.35rem]">
              See a doctor today — from home or at the clinic.
            </h1>
            <p className="animate-wasl-fade-up-delay-2 mt-5 max-w-xl text-base leading-relaxed text-white/78 sm:text-lg">
              Book a verified specialist for video or chat, reserve an in-person slot, or walk in
              for a same-day token. One record, one prescription trail, clear billing either way.
            </p>

            <div className="animate-wasl-fade-up-delay-2 mt-6 flex flex-wrap gap-2">
              {["PMDC-verified doctors", "Video, chat & walk-in", "Desk receipts"].map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm"
                >
                  <BadgeCheck className="h-3.5 w-3.5 text-brand-300" />
                  {chip}
                </span>
              ))}
            </div>

            <div className="animate-wasl-fade-up-delay-2 mt-8 max-w-4xl">
              <DoctorSearchHero variant="hero" doctorCount={doctors.length} doctors={doctors} />
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/75">
              <Link href="/assessment" className="inline-flex items-center gap-1.5 hover:text-white">
                Start a self-assessment
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link href="/#visit" className="inline-flex items-center gap-1.5 hover:text-white">
                How a visit works
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        <ConeStripe className="h-1.5" />

        <section className="border-b border-brand-900/8 bg-white">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="px-4 py-8 text-center sm:px-6 sm:py-10">
                <p className="font-heading text-xl font-bold tracking-tight text-brand-900 sm:text-2xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="services" className="bg-[#f4f8f8] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
              Care options
            </p>
            <h2 className="mt-3 max-w-xl font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Four ways to get seen — pick what fits today.
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Online visits stay prepaid. Clinic visits can be booked ahead or registered at
              reception. Your history follows you either path.
            </p>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <Link
                    key={service.title}
                    href={service.href}
                    className="group flex flex-col rounded-2xl border border-brand-900/8 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: service.accent }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-5 font-heading text-lg font-semibold tracking-tight">
                      {service.title}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                      {service.copy}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
                      Continue
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section id="specialties" className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
              Specialties
            </p>
            <ConditionBrowse
              title="What brings you in?"
              items={MENTAL_SYMPTOMS}
              type="symptom"
              viewAllHref="/browse/symptoms"
            />
          </div>
        </section>

        <section id="visit" className="bg-[#f4f8f8] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
              Patient journey
            </p>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              How a visit works
            </h2>
            <p className="mt-3 max-w-lg text-slate-600">
              From first search to completed consult — online or at the desk.
            </p>

            <ol className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, i) => (
                <li
                  key={step.n}
                  className="relative rounded-2xl border border-brand-900/8 bg-white p-6"
                >
                  <p
                    className="font-heading text-3xl font-extrabold tracking-tight"
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
                  <h3 className="mt-4 font-heading text-xl font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.copy}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="care" className="grid lg:grid-cols-2">
          <Link
            href="/doctors"
            className="group relative isolate min-h-[460px] overflow-hidden text-white"
          >
            <Image
              src="/doc_female_portrait.png"
              alt="Doctor available for online consultation"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-950/92 via-brand-950/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-8 sm:p-10">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/60">
                Online
              </p>
              <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Consult from anywhere
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/75 sm:text-base">
                Book video or chat, pay ahead, join a private room — evenings included. Notes and
                prescriptions land in your account.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium">
                Book a video visit
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>

          <Link
            href="/doctors"
            className="group relative isolate min-h-[460px] overflow-hidden text-white"
          >
            <Image
              src="/patient-login-page.jpg"
              alt="Patient receiving care in clinic"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-950/92 via-brand-950/45 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-8 sm:p-10">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/60">
                In clinic
              </p>
              <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Walk in. Get a token.
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/75 sm:text-base">
                Reception checks you in. Doctors call the next patient. Settle at the desk if you
                have not already paid online.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium">
                Reserve a clinic slot
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        </section>

        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
              Why Wasl
            </p>
            <h2 className="mt-3 max-w-xl font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Built for Pakistan’s hybrid clinic — not just another booking site.
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {reasons.map((reason) => {
                const Icon = reason.icon;
                return (
                  <div
                    key={reason.title}
                    className="rounded-2xl border border-brand-900/8 bg-[#f7fbfb] p-6"
                  >
                    <Icon className="h-6 w-6 text-brand-500" strokeWidth={1.75} />
                    <h3 className="mt-4 font-heading text-lg font-semibold tracking-tight">
                      {reason.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{reason.copy}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-brand-950 py-20 text-white sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-300">
              On the clinic floor
            </p>
            <h2 className="mt-3 max-w-xl font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Arrived at the clinic? This is what happens next.
            </h2>
            <p className="mt-3 max-w-2xl text-white/65">
              Online bookings appear on the reception board. Walk-ins are added to the same queue.
              Doctors never work from a separate list.
            </p>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {clinicFloor.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
                    <div className="flex items-center justify-between">
                      <Icon className="h-6 w-6 text-brand-300" />
                      <span className="font-heading text-sm font-semibold text-white/35">
                        0{i + 1}
                      </span>
                    </div>
                    <h3 className="mt-5 font-heading text-lg font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/60">{item.copy}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {doctors.length > 0 && (
          <section className="border-t border-brand-900/8 bg-[#f4f8f8] py-20 sm:py-24">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <Suspense fallback={null}>
                <DoctorsBrowse
                  initialDoctors={doctors}
                  title="Doctors ready today"
                  subtitle="Book video, chat, or an in-clinic visit with a verified specialist."
                  limit={3}
                  layout="grid"
                  showFilters={false}
                />
              </Suspense>
            </div>
          </section>
        )}

        <section className="relative overflow-hidden bg-white py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
            <div className="relative min-h-[320px] overflow-hidden rounded-3xl">
              <Image
                src="/online_consultation.png"
                alt="Patient preparing a short self-assessment"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
                Not sure who to see?
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Start with a short self-assessment.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Answer a few questions about sleep, mood, stress, or focus. We’ll point you toward
                the right specialty so you book a psychiatrist, psychologist, or GP with more
                confidence.
              </p>
              <Link
                href="/assessment"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
              >
                Take the assessment
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section id="reviews" className="bg-[#f4f8f8] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
              Patient stories
            </p>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Care that felt simple — online and at the desk.
            </h2>
            <div className="mt-12">
              <TestimonialsCarousel testimonials={testimonials} />
            </div>
          </div>
        </section>

        <section id="faq" className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
              Questions
            </p>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Before you book
            </h2>
            <p className="mt-3 max-w-lg text-slate-600">
              Hybrid care through {BRAND.name} — online and in the clinic.
            </p>

            <div className="mt-12 max-w-3xl divide-y divide-brand-900/10">
              {faqs.map((faq, i) => (
                <details key={faq.q} className="group py-1">
                  <summary className="flex cursor-pointer list-none items-baseline gap-6 py-5 marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="font-heading w-8 shrink-0 text-sm font-semibold text-brand-400">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 font-heading text-lg font-semibold tracking-tight text-brand-900">
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

        <section id="contact" className="border-t border-brand-900/8 bg-[#f4f8f8] py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
                Visit & contact
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Hours, cities, and the desk.
              </h2>
              <p className="mt-4 max-w-md text-slate-600">
                Video and chat run nationwide. Walk-ins and reserved clinic slots follow the
                doctor’s location and today’s queue.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-slate-700">
                <li className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-brand-500" />
                  {BRAND.phone}
                </li>
                <li className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-brand-500" />
                  {BRAND.citiesLabel}
                </li>
                <li className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-brand-500" />
                  Reception answers during clinic hours
                </li>
              </ul>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {hours.map((row) => (
                <div
                  key={row.day}
                  className="flex items-center justify-between rounded-2xl border border-brand-900/8 bg-white px-5 py-4"
                >
                  <p className="font-heading text-sm font-semibold">{row.day}</p>
                  <p className="text-sm text-slate-600">{row.time}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-brand-200/70 bg-brand-50 py-16 sm:py-20">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-4 sm:flex-row sm:items-center sm:px-6">
            <div>
              <p className="font-heading text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">
                Ready when you are
              </p>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">
                Book a secure consult, walk in for same-day care, or start with a short assessment.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/doctors"
                className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
              >
                Find a doctor
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full border border-brand-900/12 bg-white px-6 py-3 text-sm font-semibold text-brand-900 transition-colors hover:border-brand-300 hover:bg-white"
              >
                Create account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
