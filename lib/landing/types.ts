import type { AppointmentType } from "@/types";
import type { TaxonomyTag } from "@/lib/doctor/taxonomy";

export const LANDING_SECTION_IDS = [
  "hero",
  "about",
  "expertise",
  "services",
  "results",
  "reviews",
  "availability",
  "clinic",
  "online",
  "faqs",
  "cta",
] as const;

export type LandingSectionId = (typeof LANDING_SECTION_IDS)[number];

export const LANDING_ACCENTS = ["teal", "navy", "blue", "steel"] as const;
export type LandingAccent = (typeof LANDING_ACCENTS)[number];

export const LANDING_BUTTON_STYLES = ["rounded", "pill"] as const;
export type LandingButtonStyle = (typeof LANDING_BUTTON_STYLES)[number];

export const LANDING_SOCIAL_PLATFORMS = [
  "facebook",
  "instagram",
  "linkedin",
  "twitter",
  "youtube",
  "website",
] as const;
export type LandingSocialPlatform = (typeof LANDING_SOCIAL_PLATFORMS)[number];

export type LandingPageStatus = "draft" | "published" | "unpublished";
export type ReviewModerationStatus = "pending" | "approved" | "rejected";

export interface LandingSectionConfig {
  id: LandingSectionId;
  visible: boolean;
}

export interface LandingEducationItem {
  id: string;
  degree: string;
  institution: string;
  year: string;
}

export interface LandingExperienceItem {
  id: string;
  title: string;
  organization: string;
  years: string;
}

export interface LandingFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface LandingSocialLink {
  platform: LandingSocialPlatform;
  url: string;
}

export interface LandingExpertiseItem {
  id: string;
  label: string;
  description: string;
  imageUrl: string | null;
}

export interface LandingServiceCard {
  serviceId: string;
  displayName: string;
  shortDescription: string;
  imageUrl: string | null;
  benefits: string[];
  featured: boolean;
}

export interface LandingBeforeAfterItem {
  id: string;
  title: string;
  beforeUrl: string;
  afterUrl: string;
  caption: string;
}

export interface LandingContent {
  professionalTitle: string;
  shortIntro: string;
  heroHeadline: string;
  philosophy: string;
  aboutHeadline: string;
  aboutBody: string;
  aboutImageUrl: string | null;
  aboutHighlights: string[];
  trustItems: string[];
  expertise: LandingExpertiseItem[];
  education: LandingEducationItem[];
  experienceItems: LandingExperienceItem[];
  clinicName: string;
  clinicAddress: string;
  clinicCity: string;
  clinicPhone: string;
  clinicEmail: string;
  clinicHours: string;
  clinicMapUrl: string;
  onlineHeadline: string;
  onlineDescription: string;
  onlineEnabled: boolean;
  physicalEnabled: boolean;
  topBarEnabled: boolean;
  whatsappEnabled: boolean;
  whatsappNumber: string;
  accent: LandingAccent;
  buttonStyle: LandingButtonStyle;
  heroImageUrl: string | null;
  ctaPrimaryText: string;
  ctaSecondaryText: string;
  ctaBannerHeadline: string;
  footerTagline: string;
  serviceCards: LandingServiceCard[];
  beforeAfterItems: LandingBeforeAfterItem[];
  sections: LandingSectionConfig[];
  faqs: LandingFaqItem[];
  socials: LandingSocialLink[];
  seoTitle: string;
  seoDescription: string;
  ogImageUrl: string | null;
}

export interface LandingPageRecord {
  id: string;
  doctor_id: string;
  slug: string;
  status: LandingPageStatus;
  is_featured: boolean;
  draft_content: LandingContent;
  published_content: LandingContent | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicLandingReview {
  id: string;
  rating: number;
  comment: string | null;
  displayName: string;
  createdAt: string;
}

export interface PublicLandingService {
  id: string;
  serviceId: string | null;
  name: string;
  description: string;
  fee: number;
  durationMinutes: number | null;
  consultationTypes: AppointmentType[];
  isSynthetic: boolean;
  imageUrl: string | null;
  benefits: string[];
  featured: boolean;
}

export interface PublicLandingDoctor {
  id: string;
  slug: string;
  fullName: string;
  avatarUrl: string | null;
  specialization: string;
  subSpecialization: string | null;
  qualification: string[];
  experienceYears: number;
  pmdcNumber: string;
  bio: string | null;
  consultationFee: number;
  followUpFee: number | null;
  languages: string[];
  cities: string[];
  hospitalAffiliations: string[];
  rating: number;
  totalReviews: number;
  totalConsultations: number;
  isAvailable: boolean;
  taxonomyTags: TaxonomyTag[];
  gender: string | null;
}

export interface PublicAvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
}

export interface PublicLandingPageData {
  doctor: PublicLandingDoctor;
  content: LandingContent;
  status: LandingPageStatus;
  slug: string;
  isPreview: boolean;
  services: PublicLandingService[];
  reviews: PublicLandingReview[];
  availability: PublicAvailabilitySlot[];
  organization: {
    id: string;
    slug: string;
    name: string;
    kind: string;
  } | null;
}

export interface ModeratedReview {
  id: string;
  doctorId: string;
  appointmentId: string | null;
  patientId: string | null;
  rating: number;
  comment: string | null;
  displayName: string;
  moderationStatus: ReviewModerationStatus;
  isVisible: boolean;
  createdAt: string;
  moderatedAt: string | null;
}

export interface AdminLandingPageRow {
  id: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  slug: string;
  status: LandingPageStatus;
  isFeatured: boolean;
  updatedAt: string;
  publishedAt: string | null;
}

export interface LandingClinicDefaults {
  clinicName: string;
  clinicAddress: string;
  clinicCity: string;
  clinicPhone: string;
  clinicMapUrl: string;
  accent: LandingAccent;
  buttonStyle: LandingButtonStyle;
}
