import type { AppointmentType } from "@/types";
import { emptyLandingContent } from "./defaults";
import { createId } from "./slug";
import type {
  LandingAccent,
  LandingBeforeAfterItem,
  LandingButtonStyle,
  LandingClinicDefaults,
  LandingContent,
  LandingEducationItem,
  LandingExperienceItem,
  LandingExpertiseItem,
  LandingFaqItem,
  LandingSectionConfig,
  LandingSectionId,
  LandingServiceCard,
  LandingSocialLink,
  LandingSocialPlatform,
  PublicLandingDoctor,
} from "./types";
import {
  LANDING_ACCENTS,
  LANDING_BUTTON_STYLES,
  LANDING_SECTION_IDS,
  LANDING_SOCIAL_PLATFORMS,
} from "./types";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asStringArray(value: unknown, limit = 16): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, limit);
}

function asImageUrl(value: unknown): string | null {
  const raw = asString(value).trim();
  if (!raw) return null;
  if (raw.startsWith("/") || raw.startsWith("https://")) return raw.slice(0, 500);
  return null;
}

function isSectionId(value: unknown): value is LandingSectionId {
  return typeof value === "string" && (LANDING_SECTION_IDS as readonly string[]).includes(value);
}

function isAccent(value: unknown): value is LandingAccent {
  return typeof value === "string" && (LANDING_ACCENTS as readonly string[]).includes(value);
}

function isButtonStyle(value: unknown): value is LandingButtonStyle {
  return typeof value === "string" && (LANDING_BUTTON_STYLES as readonly string[]).includes(value);
}

function isSocialPlatform(value: unknown): value is LandingSocialPlatform {
  return typeof value === "string" && (LANDING_SOCIAL_PLATFORMS as readonly string[]).includes(value);
}

function parseSections(raw: unknown, fallback: LandingSectionConfig[]): LandingSectionConfig[] {
  const parsed = Array.isArray(raw)
    ? raw
        .map((item) => asRecord(item))
        .filter((item) => isSectionId(item.id))
        .map((item) => ({
          id: item.id as LandingSectionId,
          visible: asBoolean(item.visible, true),
        }))
    : [];

  const byId = new Map(parsed.map((section) => [section.id, section]));
  return fallback.map((section) => byId.get(section.id) ?? section);
}

function parseEducation(raw: unknown, fallback: LandingEducationItem[]): LandingEducationItem[] {
  if (!Array.isArray(raw)) return fallback;
  return raw
    .map((item) => asRecord(item))
    .map((item) => ({
      id: asString(item.id) || createId("edu"),
      degree: asString(item.degree),
      institution: asString(item.institution),
      year: asString(item.year),
    }))
    .filter((item) => item.degree.trim() || item.institution.trim());
}

function parseExpertise(raw: unknown): LandingExpertiseItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") {
        const label = item.trim();
        if (!label) return null;
        return { id: createId("spec"), label, description: "", imageUrl: null };
      }
      const rec = asRecord(item);
      const label = asString(rec.label).trim();
      if (!label) return null;
      return {
        id: asString(rec.id) || createId("spec"),
        label,
        description: asString(rec.description).slice(0, 160),
        imageUrl: asImageUrl(rec.imageUrl),
      };
    })
    .filter((item): item is LandingExpertiseItem => Boolean(item))
    .slice(0, 16);
}

function parseServiceCards(raw: unknown): LandingServiceCard[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const cards: LandingServiceCard[] = [];
  for (const item of raw) {
    const rec = asRecord(item);
    const serviceId = asString(rec.serviceId);
    if (!serviceId || seen.has(serviceId)) continue;
    seen.add(serviceId);
    cards.push({
      serviceId,
      displayName: asString(rec.displayName).slice(0, 80),
      shortDescription: asString(rec.shortDescription).slice(0, 280),
      imageUrl: asImageUrl(rec.imageUrl),
      benefits: asStringArray(rec.benefits, 4).map((line) => line.slice(0, 80)),
      featured: asBoolean(rec.featured, false),
    });
  }
  return cards.slice(0, 24);
}

function parseBeforeAfter(raw: unknown): LandingBeforeAfterItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => asRecord(item))
    .map((item) => ({
      id: asString(item.id) || createId("ba"),
      title: asString(item.title).slice(0, 80),
      beforeUrl: asImageUrl(item.beforeUrl) ?? "",
      afterUrl: asImageUrl(item.afterUrl) ?? "",
      caption: asString(item.caption).slice(0, 140),
    }))
    .filter((item) => item.beforeUrl || item.afterUrl || item.caption || item.title)
    .slice(0, 12);
}

function parseExperience(raw: unknown, fallback: LandingExperienceItem[]): LandingExperienceItem[] {
  if (!Array.isArray(raw)) return fallback;
  return raw
    .map((item) => asRecord(item))
    .map((item) => ({
      id: asString(item.id) || createId("exp"),
      title: asString(item.title),
      organization: asString(item.organization),
      years: asString(item.years),
    }))
    .filter((item) => item.title.trim() || item.organization.trim());
}

function parseFaqs(raw: unknown, fallback: LandingFaqItem[]): LandingFaqItem[] {
  if (!Array.isArray(raw)) return fallback;
  return raw
    .map((item) => asRecord(item))
    .map((item) => ({
      id: asString(item.id) || createId("faq"),
      question: asString(item.question),
      answer: asString(item.answer),
    }))
    .filter((item) => item.question.trim());
}

const ALLOWED_SOCIAL_HOSTS: Record<LandingSocialPlatform, RegExp> = {
  facebook: /^https:\/\/(www\.)?facebook\.com\//i,
  instagram: /^https:\/\/(www\.)?instagram\.com\//i,
  linkedin: /^https:\/\/(www\.)?linkedin\.com\//i,
  twitter: /^https:\/\/(www\.)?(twitter\.com|x\.com)\//i,
  youtube: /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i,
  website: /^https:\/\//i,
};

export function sanitizeSocialUrl(platform: LandingSocialPlatform, url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return null;
    if (!ALLOWED_SOCIAL_HOSTS[platform].test(parsed.href)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function parseSocials(raw: unknown): LandingSocialLink[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<LandingSocialPlatform>();
  const links: LandingSocialLink[] = [];
  for (const item of raw) {
    const rec = asRecord(item);
    if (!isSocialPlatform(rec.platform) || seen.has(rec.platform)) continue;
    const url = sanitizeSocialUrl(rec.platform, asString(rec.url));
    if (!url) continue;
    seen.add(rec.platform);
    links.push({ platform: rec.platform, url });
  }
  return links;
}

export function parseLandingContent(
  raw: unknown,
  doctor?: Pick<
    PublicLandingDoctor,
    "fullName" | "specialization" | "qualification" | "bio" | "experienceYears"
  >,
  clinic?: LandingClinicDefaults,
): LandingContent {
  const defaults = emptyLandingContent(doctor, clinic);
  const rec = asRecord(raw);

  const highlights = asStringArray(rec.aboutHighlights, 6);
  const trust = asStringArray(rec.trustItems, 4);

  return {
    professionalTitle: asString(rec.professionalTitle, defaults.professionalTitle),
    shortIntro: asString(rec.shortIntro, defaults.shortIntro).slice(0, 280),
    heroHeadline: asString(rec.heroHeadline, defaults.heroHeadline).slice(0, 90),
    philosophy: asString(rec.philosophy, defaults.philosophy).slice(0, 2000),
    aboutHeadline: asString(rec.aboutHeadline, defaults.aboutHeadline).slice(0, 90),
    aboutBody: asString(rec.aboutBody, defaults.aboutBody).slice(0, 2000),
    aboutImageUrl: asImageUrl(rec.aboutImageUrl),
    aboutHighlights: highlights.length ? highlights : defaults.aboutHighlights,
    trustItems: trust.length ? trust : defaults.trustItems,
    expertise: parseExpertise(rec.expertise),
    education: parseEducation(rec.education, defaults.education).slice(0, 12),
    experienceItems: parseExperience(rec.experienceItems, defaults.experienceItems).slice(0, 12),
    clinicName: asString(rec.clinicName, defaults.clinicName),
    clinicAddress: asString(rec.clinicAddress, defaults.clinicAddress),
    clinicCity: asString(rec.clinicCity, defaults.clinicCity),
    clinicPhone: asString(rec.clinicPhone, defaults.clinicPhone),
    clinicEmail: asString(rec.clinicEmail, defaults.clinicEmail),
    clinicHours: asString(rec.clinicHours, defaults.clinicHours),
    clinicMapUrl: asString(rec.clinicMapUrl, defaults.clinicMapUrl),
    onlineHeadline: asString(rec.onlineHeadline, defaults.onlineHeadline),
    onlineDescription: asString(rec.onlineDescription, defaults.onlineDescription),
    onlineEnabled: asBoolean(rec.onlineEnabled, defaults.onlineEnabled),
    physicalEnabled: asBoolean(rec.physicalEnabled, defaults.physicalEnabled),
    topBarEnabled: asBoolean(rec.topBarEnabled, defaults.topBarEnabled),
    whatsappEnabled: asBoolean(rec.whatsappEnabled, defaults.whatsappEnabled),
    whatsappNumber: asString(rec.whatsappNumber, defaults.whatsappNumber)
      .replace(/[^\d+]/g, "")
      .slice(0, 20),
    accent: isAccent(rec.accent) ? rec.accent : defaults.accent,
    buttonStyle: isButtonStyle(rec.buttonStyle) ? rec.buttonStyle : defaults.buttonStyle,
    heroImageUrl: asImageUrl(rec.heroImageUrl),
    ctaPrimaryText: asString(rec.ctaPrimaryText, defaults.ctaPrimaryText) || "Book an Appointment",
    ctaSecondaryText: asString(rec.ctaSecondaryText, defaults.ctaSecondaryText) || "View Availability",
    ctaBannerHeadline: asString(rec.ctaBannerHeadline, defaults.ctaBannerHeadline).slice(0, 90),
    footerTagline: asString(rec.footerTagline, defaults.footerTagline).slice(0, 180),
    serviceCards: parseServiceCards(rec.serviceCards),
    beforeAfterItems: parseBeforeAfter(rec.beforeAfterItems),
    sections: parseSections(rec.sections, defaults.sections),
    faqs: parseFaqs(rec.faqs, defaults.faqs).slice(0, 12),
    socials: parseSocials(rec.socials),
    seoTitle: asString(rec.seoTitle, defaults.seoTitle).slice(0, 80),
    seoDescription: asString(rec.seoDescription, defaults.seoDescription).slice(0, 180),
    ogImageUrl: asImageUrl(rec.ogImageUrl),
  };
}

export const CONSULT_TYPE_LABELS: Record<AppointmentType, string> = {
  in_person: "Physical Consultation",
  video: "Online Consultation",
  chat: "Chat Consultation",
};
