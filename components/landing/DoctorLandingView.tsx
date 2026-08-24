"use client";

import Image from "next/image";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Cpu,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Video,
} from "lucide-react";
import {
  availabilitySummary,
  DAY_LABELS,
  formatSlotRange,
  groupedAvailability,
  isSectionVisible,
  landingTheme,
} from "@/lib/landing/display";
import type { AppointmentType } from "@/types";
import type { PublicLandingPageData } from "@/lib/landing/types";
import { BookButton, LandingBookingRoot } from "./LandingBooking";
import { LandingStickyCta } from "./LandingStickyCta";
import { DoctorSiteHeader } from "./DoctorSiteHeader";
import { DoctorContactBar, DoctorSiteFooter } from "./DoctorSiteFooter";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { LandingDiseaseCards } from "./LandingDiseaseCards";
import { LandingServiceCards } from "./LandingServiceCards";
import { LandingTestimonials } from "./LandingTestimonials";
import { LandingWhatsAppFloat } from "./LandingWhatsAppFloat";
import { cn } from "@/lib/utils";

const TRUST_ICONS = [Award, Cpu, BadgeCheck, ShieldCheck];

function splitHeadline(headline: string): { lead: string; accent: string } {
  const parts = headline.trim().split(/\s+/);
  if (parts.length < 3) return { lead: headline, accent: "" };
  return {
    lead: parts.slice(0, -2).join(" "),
    accent: parts.slice(-2).join(" "),
  };
}

function SectionKicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-500">
      {children}
    </p>
  );
}

export function DoctorLandingView({
  data,
  preview = false,
}: {
  data: PublicLandingPageData;
  preview?: boolean;
}) {
  const { doctor, content, services, reviews, availability } = data;
  const theme = landingTheme(data);
  const allowedTypes: AppointmentType[] = [
    ...(content.physicalEnabled ? (["in_person"] as const) : []),
    ...(content.onlineEnabled ? (["video"] as const) : []),
  ];
  const schedule = groupedAvailability(availability);
  const photo = content.heroImageUrl || doctor.avatarUrl;
  const firstName = doctor.fullName.split(" ")[0];
  const aboutText = content.aboutBody.trim() || doctor.bio || content.shortIntro;
  const aboutImage = content.aboutImageUrl || "/patient-login-page.jpg";
  const aboutTitle = splitHeadline(content.aboutHeadline);
  const trust = (content.trustItems.length ? content.trustItems : []).slice(0, 4);
  const quotedReviews = reviews.filter((row) => row.comment?.trim());

  const shell = (
    <div
      className={cn(
        "landing-page bg-white text-brand-900",
        preview && "pointer-events-none select-none",
      )}
    >
      {data.isPreview && !preview && (
        <div className="bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-amber-950">
          Preview — this draft is not what patients see until you publish.
        </div>
      )}

      <DoctorSiteHeader data={data} preview={preview} />

      <section id="home" className="bg-brand-50">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pt-16">
          <div>
            <SectionKicker>{doctor.specialization}</SectionKicker>
            <h1 className="mt-4 font-serif text-[2.6rem] font-semibold leading-[1.08] tracking-tight text-brand-900 sm:text-5xl lg:text-[3.4rem]">
              {content.heroHeadline}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              {content.shortIntro}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <BookButton
                type={content.physicalEnabled ? "in_person" : "video"}
                className="h-12 min-w-[210px] rounded-full bg-brand-800 px-7 hover:bg-brand-900"
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                {content.ctaPrimaryText}
              </BookButton>
              <a
                href="#services"
                className="inline-flex h-12 min-w-[210px] items-center justify-center rounded-full border-2 border-brand-800 bg-transparent px-7 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-800 hover:text-white"
              >
                {content.ctaSecondaryText}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[28rem]">
            <div className="absolute -left-4 top-8 hidden h-24 w-24 rounded-full bg-brand-200/50 lg:block" />
            <div className="relative aspect-[4/4.55] overflow-hidden rounded-[2rem] bg-brand-100 shadow-[0_28px_70px_rgba(15,20,42,0.16)]">
              {photo ? (
                <Image
                  src={photo}
                  alt={doctor.fullName}
                  fill
                  priority
                  sizes="(max-width: 1024px) 90vw, 420px"
                  className="object-cover object-top"
                  unoptimized
                />
              ) : (
                <Image
                  src={doctor.gender === "male" ? "/doc_male_portrait.png" : "/doc_female_portrait.png"}
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 1024px) 90vw, 420px"
                  className="object-cover object-top"
                />
              )}
            </div>
            <div className="absolute -bottom-5 left-4 right-4 sm:left-6 sm:right-auto">
              <div className="flex items-center gap-3 rounded-2xl bg-white p-3 pr-3 shadow-[0_16px_40px_rgba(15,20,42,0.14)]">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-brand-900">Book Your Appointment</p>
                  <p className="text-xs text-slate-500">Clinic visit or online</p>
                </div>
                <BookButton className="ml-2 h-10 w-10 shrink-0 rounded-full bg-brand-800 p-0 hover:bg-brand-900">
                  <ArrowRight className="h-4 w-4" />
                </BookButton>
              </div>
            </div>
          </div>
        </div>

        {trust.length > 0 && (
          <div className="mt-10 border-t border-brand-900/6 bg-white">
            <div className="mx-auto grid max-w-6xl grid-cols-2 sm:grid-cols-4">
              {trust.map((item, index) => {
                const Icon = TRUST_ICONS[index % TRUST_ICONS.length];
                return (
                  <div
                    key={item}
                    className="flex items-center gap-3 px-4 py-8 sm:justify-center sm:px-6"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="text-sm font-semibold text-brand-900">{item}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {isSectionVisible(content, "about") && (
        <section id="about" className="relative overflow-hidden bg-white py-16 sm:py-24">
          <svg
            className="pointer-events-none absolute -right-16 top-10 h-[28rem] w-[22rem] text-brand-200/50"
            viewBox="0 0 200 320"
            fill="currentColor"
            aria-hidden
          >
            <path d="M120 20c-28 42-18 78 8 118-38-8-62 18-70 58 36-10 62 6 78 38-48 6-62 42-52 86 52-28 86-8 104 36-8-92 10-150-18-210 22-18 28-48 12-78-22 22-48 18-62 0z" />
            <path
              d="M92 48c-12 36 4 62 28 88-32 0-50 22-54 52 28-6 46 8 56 30-34 10-42 38-32 68 38-22 64-6 78 24-12-70 2-118-22-168 18-16 20-42 6-64-16 18-38 12-50-2z"
              className="text-brand-100"
            />
          </svg>
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-brand-50 shadow-[0_18px_50px_rgba(15,20,42,0.08)] sm:aspect-[5/4]">
              <Image
                src={aboutImage}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 520px"
                unoptimized={Boolean(content.aboutImageUrl)}
              />
            </div>
            <div>
              <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-700">
                About {doctor.fullName}
                <Sparkles className="h-3.5 w-3.5 text-brand-500" />
              </p>
              <h2 className="mt-4 font-serif text-3xl font-semibold leading-[1.15] tracking-tight text-brand-900 sm:text-[2.6rem]">
                {aboutTitle.lead}
                {aboutTitle.accent ? (
                  <>
                    {aboutTitle.lead ? " " : ""}
                    <span className="text-brand-500">{aboutTitle.accent}</span>
                  </>
                ) : null}
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">{aboutText}</p>
              {content.philosophy && (
                <blockquote className="mt-5 border-l-2 border-brand-500 pl-4 font-serif text-lg text-brand-900">
                  {content.philosophy}
                </blockquote>
              )}
              <ul className="mt-7 space-y-3.5">
                {content.aboutHighlights.map((line) => (
                  <li key={line} className="flex items-start gap-3 text-[15px] text-brand-900">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
              <a
                href="#services"
                className="mt-8 inline-flex h-12 items-center rounded-full bg-brand-800 px-7 text-sm font-semibold text-white hover:bg-brand-900"
              >
                Know More About {firstName}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      )}

      {isSectionVisible(content, "expertise") && content.expertise.length > 0 && (
        <section id="specialties" className="bg-[#f7fbfb] py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <SectionKicker>Conditions we treat</SectionKicker>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                What {firstName} treats
              </h2>
              <p className="mt-3 text-slate-600">
                Common conditions and concerns managed with careful, personalized care.
              </p>
            </div>
            <div className="mt-12">
              <LandingDiseaseCards items={content.expertise} />
            </div>
          </div>
        </section>
      )}

      {isSectionVisible(content, "services") && (
        <section id="services" className="bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <SectionKicker>Treatment Services</SectionKicker>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                Our Services
              </h2>
              <p className="mt-3 text-slate-600">
                Choose the visit that fits today — clinic first, online when you cannot come in.
              </p>
            </div>
            <div className="mt-12">
              <LandingServiceCards services={services} />
            </div>
          </div>
        </section>
      )}

      {isSectionVisible(content, "results") && (
        <section id="results" className="bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <BeforeAfterSlider items={content.beforeAfterItems} />
          </div>
        </section>
      )}

      {isSectionVisible(content, "reviews") && (
        <section id="reviews" className="bg-[#f8fafb] py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center">
              <SectionKicker>Patient reviews</SectionKicker>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                What Our Patients Say
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-slate-600">
                Verified feedback from patients who completed a visit with {firstName}.
              </p>
            </div>
            <LandingTestimonials
              reviews={quotedReviews}
              rating={doctor.rating}
              total={doctor.totalReviews}
              doctorName={firstName}
            />
          </div>
        </section>
      )}

      {isSectionVisible(content, "availability") && (
        <section id="availability" className="bg-[#f4f8f8] py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <SectionKicker>Hours</SectionKicker>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                Availability this week
              </h2>
              <p className="mt-3 text-slate-600">
                Live clinic schedule — the same hours used when you book a slot.
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
              {content.physicalEnabled && (
                <div className="rounded-2xl border border-brand-900/8 bg-white p-6 shadow-sm">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <Stethoscope className="h-5 w-5" />
                  </span>
                  <p className="mt-4 font-serif text-lg font-semibold text-brand-900">
                    Physical clinic
                  </p>
                  <p className="mt-1.5 flex items-start gap-2 text-sm text-slate-600">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                    {availabilitySummary(availability)}
                  </p>
                  <BookButton
                    type="in_person"
                    className="mt-5 h-10 w-full rounded-full bg-brand-800 hover:bg-brand-900"
                  >
                    Book physical visit
                  </BookButton>
                </div>
              )}
              {content.onlineEnabled && (
                <div className="rounded-2xl border border-brand-900/8 bg-white p-6 shadow-sm">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <Video className="h-5 w-5" />
                  </span>
                  <p className="mt-4 font-serif text-lg font-semibold text-brand-900">Online</p>
                  <p className="mt-1.5 flex items-start gap-2 text-sm text-slate-600">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                    {availabilitySummary(availability)}
                  </p>
                  <BookButton
                    type="video"
                    className="mt-5 h-10 w-full rounded-full bg-brand-800 hover:bg-brand-900"
                  >
                    Book online consult
                  </BookButton>
                </div>
              )}
            </div>

            <div className="mx-auto mt-6 max-w-4xl overflow-hidden rounded-2xl border border-brand-900/8 bg-white shadow-sm">
              {Object.keys(schedule).length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">
                  Hours will appear once the schedule is set.
                </p>
              ) : (
                Object.entries(schedule)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([day, slots], index, list) => (
                    <div
                      key={day}
                      className={cn(
                        "flex items-center justify-between gap-4 px-5 py-3.5",
                        index < list.length - 1 && "border-b border-brand-900/6",
                      )}
                    >
                      <span className="font-heading text-sm font-semibold tracking-tight text-brand-900">
                        {DAY_LABELS[Number(day)]}
                      </span>
                      <span className="text-sm text-slate-500">
                        {slots.map((slot, i) => (
                          <span key={i}>
                            {i > 0 ? ", " : ""}
                            {formatSlotRange(slot.start_time, slot.end_time)}
                          </span>
                        ))}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </section>
      )}

      {(content.education.length > 0 || content.experienceItems.length > 0) &&
        isSectionVisible(content, "about") && (
          <section className="bg-white py-16 sm:py-20">
            <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2">
              {content.education.length > 0 && (
                <div>
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    <GraduationCap className="h-3.5 w-3.5" />
                    Education
                  </p>
                  <ol className="mt-4 space-y-5 border-l border-brand-900/10 pl-5">
                    {content.education.map((item, i) => (
                      <li key={item.id}>
                        <p className="font-heading text-sm font-semibold text-brand-400">
                          {String(i + 1).padStart(2, "0")}
                        </p>
                        <p className="mt-1 font-heading text-lg font-semibold">{item.degree}</p>
                        <p className="text-sm text-slate-500">
                          {[item.institution, item.year].filter(Boolean).join(" · ")}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {content.experienceItems.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Experience
                  </p>
                  <ol className="mt-4 space-y-5 border-l border-brand-900/10 pl-5">
                    {content.experienceItems.map((item, i) => (
                      <li key={item.id}>
                        <p className="font-heading text-sm font-semibold text-brand-400">
                          {String(i + 1).padStart(2, "0")}
                        </p>
                        <p className="mt-1 font-heading text-lg font-semibold">{item.title}</p>
                        <p className="text-sm text-slate-500">
                          {[item.organization, item.years].filter(Boolean).join(" · ")}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </section>
        )}

      {isSectionVisible(content, "faqs") && content.faqs.length > 0 && (
        <section className="bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <SectionKicker>Questions</SectionKicker>
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                Before you book
              </h2>
              <p className="mt-3 text-slate-600">
                Quick answers about visits, online consults, and booking with {firstName}.
              </p>
            </div>
            <div className="mx-auto mt-10 max-w-3xl space-y-3">
              {content.faqs.map((faq, i) => (
                <details
                  key={faq.id}
                  className="group rounded-2xl border border-brand-900/8 bg-[#f7fbfb] px-5 shadow-sm open:bg-white open:shadow-md"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-4 py-5 marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 font-heading text-xs font-bold text-brand-600">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 text-left font-heading text-base font-semibold tracking-tight text-brand-900 sm:text-lg">
                      {faq.question}
                    </span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-900/10 bg-white text-brand-600 transition-transform group-open:rotate-180">
                      <ChevronDown className="h-4 w-4" />
                    </span>
                  </summary>
                  <p className="border-t border-brand-900/6 pb-5 pl-12 pr-2 pt-4 text-left text-sm leading-relaxed text-slate-600">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {isSectionVisible(content, "cta") && (
        <section className="relative isolate overflow-hidden bg-brand-950 py-16 text-white sm:py-24">
          <div className="absolute inset-0 bg-[url('/patient-login-page.jpg')] bg-cover bg-center opacity-20" />
          <div className="absolute inset-0 bg-brand-950/75" />
          <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              {content.ctaBannerHeadline}
            </h2>
            <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/85">
              {trust.slice(0, 3).map((item) => (
                <li key={item} className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-300" />
                  {item}
                </li>
              ))}
            </ul>
            <BookButton className="mt-8 h-12 min-w-[220px] rounded-full bg-brand-500 hover:bg-brand-400">
              <CalendarDays className="mr-2 h-4 w-4" />
              {content.ctaPrimaryText}
            </BookButton>
          </div>
        </section>
      )}

      <DoctorContactBar data={data} />
      <DoctorSiteFooter data={data} />
      {!preview && <LandingStickyCta name={doctor.fullName} physical={content.physicalEnabled} />}
      <LandingWhatsAppFloat content={content} doctorName={doctor.fullName} preview={preview} />
    </div>
  );

  if (preview) return shell;

  return (
    <LandingBookingRoot
      doctor={{
        id: doctor.id,
        slug: doctor.slug,
        name: doctor.fullName,
        consultationFee: doctor.consultationFee,
      }}
      allowedTypes={allowedTypes.length ? allowedTypes : ["in_person"]}
      buttonClass={theme.button}
      pill="rounded-full"
    >
      {shell}
    </LandingBookingRoot>
  );
}
