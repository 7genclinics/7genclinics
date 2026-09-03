import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { LandingHeader } from "@/components/public/LandingHeader";
import { LandingFooter } from "@/components/public/LandingFooter";
import { DoctorSearchHero } from "@/components/public/DoctorSearchHero";
import { LandingDoctorsSection } from "@/components/public/LandingDoctorsSection";
import { LandingClinicsSection } from "@/components/public/LandingClinicsSection";
import { TestimonialsCarousel } from "@/components/public/TestimonialsCarousel";
import { TopSpecialitiesSection } from "@/components/public/TopSpecialitiesSection";
import { ConeStripe } from "@/components/brand/BrandMark";
import { getApprovedDoctorsServer } from "@/lib/public/doctors";
import { getListedOrganizationsServer } from "@/lib/public/organizations";
import { BRAND } from "@/lib/brand/site";
import { CONE_COLORS } from "@/lib/brand/colors";
import { pageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  breadcrumbListJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...pageMetadata({
    title: `${BRAND.name}, Pakistan's best online and physical clinic platform`,
    description: BRAND.description,
    path: "/",
  }),
  title: {
    absolute: `${BRAND.name}, Pakistan's best online and physical clinic platform`,
  },
};

const services = [
  {
    title: "Video consultation",
    copy: "Join a private room from your phone or laptop. Pay ahead, evenings included.",
    href: "/doctors/",
    image: "/card_video_consultation.png",
  },
  {
    title: "Chat with a doctor",
    copy: "Message based care when you need advice without a live video call.",
    href: "/doctors/",
    image: "/card_chat_doctor.png",
  },
  {
    title: "Clinic appointment",
    copy: "Reserve a physical slot. Reception checks you in and issues a queue token.",
    href: "/doctors/",
    image: "/card_clinic_appointment.png",
  },
  {
    title: "Walk in visit",
    copy: "No booking needed. Register at the desk, wait your turn, settle after the consult.",
    href: "/register/",
    image: "/card_walk_in_visit.png",
  },
];

const steps = [
  {
    n: "01",
    title: "Find a doctor",
    copy: "Search by city, specialty, or name. Only PMDC verified profiles are listed.",
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
    title: "Consult and settle",
    copy: "Notes and prescriptions follow. Pay online ahead, or at the desk after. Never twice.",
  },
];

const reasons = [
  {
    title: "Verified clinicians",
    copy: "Every listed doctor is reviewed before they can take patients.",
    image: "/feature_verified_clinicians.png",
  },
  {
    title: "One record, both doors",
    copy: "Online booking and clinic floor share the same appointment. No duplicate files.",
    image: "/feature_shared_records.png",
  },
  {
    title: "Live queue tokens",
    copy: "Reception issues a number. Doctors call the next patient from their queue.",
    image: "/feature_live_queue_tokens.png",
  },
  {
    title: "Prescriptions that travel",
    copy: "Print or download your Rx after video, chat, or a physical consult.",
    image: "/feature_prescriptions_travel.png",
  },
  {
    title: "Clear payments",
    copy: "Prepaid online visits. Walk ins settle at reception. No double charge.",
    image: "/feature_clear_payments.png",
  },
  {
    title: "Self assessment first",
    copy: "Not sure who to see? Start with a short screening, then book the right specialty.",
    image: "/feature_self_assessment.png",
  },
];

const clinicFloor = [
  {
    title: "Check in",
    copy: "Show your booking or register as a walk in. Reception confirms your details.",
    image: "/workflow_check_in.png",
  },
  {
    title: "Get a token",
    copy: "You join today’s waiting list. The screen and desk both know your place.",
    image: "/workflow_get_token.png",
  },
  {
    title: "See the doctor",
    copy: "When your number is called, you go in. Notes, diagnosis, and Rx are recorded.",
    image: "/workflow_see_doctor.png",
  },
  {
    title: "Pay at the desk",
    copy: "If you did not prepay online, reception collects the fee and can print a receipt.",
    image: "/workflow_pay_at_desk.png",
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
    role: "Walk in",
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
      "Chat consult for my sleep issues was straightforward. Later I reserved a clinic slot with the same psychiatrist.",
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
    role: "In clinic",
  },
  {
    quote:
      "Used the self assessment, then booked a psychologist. The search filters by city saved me a lot of guesswork.",
    name: "Omar J.",
    city: "Peshawar",
    rating: 5,
    role: "Assessment",
  },
];

const faqs = [
  {
    q: "Is Apna Clinic only online?",
    a: "No. Apna Clinic is Pakistan's best platform for online and physical care: video and chat from home, or a clinic visit with reception check in, queue tokens, and desk billing.",
  },
  {
    q: "Do I need an account to browse?",
    a: "No. Explore verified doctors without signing up. You will need an account when you book a slot or complete a walk in registration.",
  },
  {
    q: "Can I walk in without booking?",
    a: "Yes. Reception can register walk in patients, assign a doctor, and place you in today’s queue.",
  },
  {
    q: "How do payments work?",
    a: "Online bookings stay prepaid. Unpaid clinic visits settle at reception after the consult. Never charged twice if you already paid online.",
  },
  {
    q: "Will the doctor see my past visits?",
    a: "Yes. Online and clinic visits share one record. Notes, prescriptions, and previous appointments stay with your profile.",
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
    a: `${BRAND.citiesLabel}. Video and chat are available nationwide. Physical care depends on the doctor’s clinic location.`,
  },
];

export default async function HomePage() {
  const [doctors, clinics] = await Promise.all([
    getApprovedDoctorsServer().catch(() => []),
    getListedOrganizationsServer().catch(() => []),
  ]);

  return (
    <div className="landing-page min-h-screen bg-white text-brand-900">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <JsonLd data={breadcrumbListJsonLd([])} />
      <LandingHeader overlay />

      <main>
        <section className="relative isolate min-h-[100svh] overflow-hidden text-white">
          <Image
            src="/landing-hero%20bg.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-950/55 via-brand-950/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-brand-950/50 to-transparent" />

          <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-4 pb-10 pt-28 sm:px-6 sm:pb-14 lg:justify-center lg:pb-20 lg:pt-32">
            <p className="animate-wasl-fade-up text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-300">
              Pakistan's best platform · Online plus physical
            </p>
            <h1 className="animate-wasl-fade-up-delay mt-4 max-w-2xl font-heading text-[2.35rem] font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.35rem]">
              Pakistan's best platform for online and physical care.
            </h1>
            <p className="animate-wasl-fade-up-delay-2 mt-5 max-w-xl text-base leading-relaxed text-white/78 sm:text-lg">
              Book a verified specialist for video or chat from home, reserve a clinic slot, or walk
              in for a same day token. One record, one prescription trail, clear billing either way.
            </p>

            <div className="animate-wasl-fade-up-delay-2 mt-6 flex flex-wrap gap-2">
              {["PMDC verified doctors", "Online plus physical", "Desk receipts"].map((chip) => (
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
              <Link href="/#visit" className="inline-flex items-center gap-1.5 hover:text-white">
                How a visit works
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        <ConeStripe className="h-1.5" />

        <section id="services" className="bg-[#f4f8f8] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
              Care options
            </p>
            <h2 className="mt-3 max-w-xl font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Four ways to get seen. Pick what fits today.
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Online visits stay prepaid. Clinic visits can be booked ahead or registered at
              reception. Your history follows you either path.
            </p>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {services.map((service) => (
                <Link
                  key={service.title}
                  href={service.href}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-brand-900/8 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-[#eef6f6]">
                    <Image
                      src={service.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-heading text-lg font-semibold tracking-tight">
                      {service.title}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                      {service.copy}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
                      Continue
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <TopSpecialitiesSection />

        <LandingClinicsSection clinics={clinics} />

        <LandingDoctorsSection doctors={doctors} />

        <section id="visit" className="bg-[#f4f8f8] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
              Patient journey
            </p>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              How a visit works
            </h2>
            <p className="mt-3 max-w-lg text-slate-600">
              From first search to completed consult, online or at the desk.
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

        <section id="care" className="bg-[#F4F8F8] py-10 sm:py-14">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:px-6 lg:grid-cols-2">
            <Link
              href="/doctors/"
              className="group relative isolate min-h-[460px] overflow-hidden rounded-2xl text-white"
            >
              <Image
                src="/bg_online_consultation.jpg"
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
                  Book video or chat, pay ahead, join a private room, evenings included. Notes and
                  prescriptions land in your account.
                </p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium">
                  Book a video visit
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>

            <Link
              href="/doctors/"
              className="group relative isolate min-h-[460px] overflow-hidden rounded-2xl text-white"
            >
              <Image
                src="/bg_clinic_reception_desk.jpg"
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
          </div>
        </section>

        <section className="bg-[#F4F8F8] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
              Why Apna Clinic
            </p>
            <h2 className="mt-3 max-w-xl font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Pakistan's best online plus physical clinic. Not just another booking site.
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {reasons.map((reason) => (
                <div
                  key={reason.title}
                  className="overflow-hidden rounded-2xl border border-brand-900/8 bg-white shadow-sm"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-white">
                    <Image
                      src={reason.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover object-top"
                    />
                  </div>
                  <div className="bg-white px-5 py-4">
                    <h3 className="font-heading text-lg font-semibold tracking-tight">
                      {reason.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{reason.copy}</p>
                  </div>
                </div>
              ))}
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
              Online bookings appear on the reception board. Walk ins are added to the same queue.
              Doctors never work from a separate list.
            </p>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {clinicFloor.map((item, i) => (
                <div
                  key={item.title}
                  className="overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-[#F4F8F8]">
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <span className="font-heading text-sm font-semibold text-white/35">
                        0{i + 1}
                      </span>
                    </div>
                    <h3 className="mt-3 font-heading text-lg font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/60">{item.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-white py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
            <div className="relative min-h-[320px] overflow-hidden rounded-3xl">
              <Image
                src="/online_consultation.jpg"
                alt="Patient preparing a short self assessment"
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
                Start with a short self assessment.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Answer a few questions about sleep, mood, stress, or focus. We’ll point you toward
                the right specialty so you book a psychiatrist, psychologist, or GP with more
                confidence.
              </p>
              <Link
                href="/assessment/"
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
              Care that felt simple, online and at the desk.
            </h2>
            <div className="mt-12">
              <TestimonialsCarousel testimonials={testimonials} />
            </div>
          </div>
        </section>

        <section id="faq" className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
                Questions
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Before you book
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-slate-600">
                Pakistan's best platform for online and physical care through {BRAND.name}.
              </p>
            </div>

            <div className="mx-auto mt-12 max-w-3xl divide-y divide-brand-900/10">
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

        <section className="relative isolate min-h-[360px] overflow-hidden sm:min-h-[420px] lg:min-h-[480px]">
          <Image
            src="/online_consultation.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-brand-950/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-950/70 via-brand-950/35 to-brand-950/40" />

          <div className="relative mx-auto flex h-full max-w-6xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6 sm:py-28 lg:py-32">
            <div>
              <p className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
                Ready when you are
              </p>
              <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/80 sm:text-base">
                Book a secure consult, walk in for same day care, or start with a short assessment.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/doctors/"
                className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
              >
                Find a doctor
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/register/"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/90 px-6 py-3 text-sm font-semibold text-brand-900 backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-white"
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
