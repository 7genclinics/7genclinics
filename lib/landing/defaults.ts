import { BRAND } from "@/lib/brand/site";
import { createId } from "@/lib/landing/slug";
import type {
  LandingClinicDefaults,
  LandingContent,
  LandingSectionConfig,
  LandingSectionId,
  PublicLandingDoctor,
} from "./types";
import { LANDING_SECTION_IDS } from "./types";

export const DEFAULT_CLINIC: LandingClinicDefaults = {
  clinicName: BRAND.name,
  clinicAddress: "",
  clinicCity: "Lahore",
  clinicPhone: BRAND.phone,
  clinicMapUrl: "",
  accent: "teal",
  buttonStyle: "rounded",
};

export const DEFAULT_SECTIONS: LandingSectionConfig[] = LANDING_SECTION_IDS.map((id) => ({
  id,
  visible: id !== "results",
}));

export const DEFAULT_TRUST_ITEMS = [
  "Expert Care",
  "Advanced Technology",
  "Proven Results",
  "Trusted Professional",
];

export const DEFAULT_ABOUT_HIGHLIGHTS = [
  "Experienced & PMDC-verified specialist",
  "Advanced & safe treatment techniques",
  "Patient-centered care & lasting results",
];

export function defaultFaqs(doctorName: string): LandingContent["faqs"] {
  return [
    {
      id: createId("faq"),
      question: "Can I book a physical appointment?",
      answer: `Yes. Select Physical Consultation when booking with ${doctorName}. Reception will check you in at the clinic.`,
    },
    {
      id: createId("faq"),
      question: "Do you offer online consultations?",
      answer:
        "Yes. Book a video consultation from anywhere in Pakistan. Payment is confirmed before the session starts.",
    },
    {
      id: createId("faq"),
      question: "How can I reschedule?",
      answer:
        "Use your patient appointments page to manage upcoming visits. Follow the existing appointment process for changes.",
    },
  ];
}

export function emptyLandingContent(
  doctor?: Pick<
    PublicLandingDoctor,
    "fullName" | "specialization" | "qualification" | "bio" | "experienceYears"
  >,
  clinic: LandingClinicDefaults = DEFAULT_CLINIC,
): LandingContent {
  const name = doctor?.fullName ?? "the doctor";
  const spec = doctor?.specialization ?? "specialist";
  const title = doctor?.qualification?.length
    ? `${doctor.qualification[0]} · ${spec}`
    : spec;
  const intro =
    doctor?.bio?.trim() ||
    `Helping patients receive thoughtful, evidence-based ${spec.toLowerCase()} care — in clinic and online.`;

  return {
    professionalTitle: title,
    shortIntro: intro.slice(0, 280),
    heroHeadline: "Care that feels personal — and gets results.",
    philosophy: "",
    aboutHeadline: "Dedicated to careful, personal care.",
    aboutBody: doctor?.bio?.trim() || "",
    aboutImageUrl: null,
    aboutHighlights: [...DEFAULT_ABOUT_HIGHLIGHTS],
    trustItems: [...DEFAULT_TRUST_ITEMS],
    expertise: [],
    education: doctor?.qualification?.length
      ? doctor.qualification.map((degree) => ({
          id: createId("edu"),
          degree,
          institution: "",
          year: "",
        }))
      : [],
    experienceItems: doctor
      ? [
          {
            id: createId("exp"),
            title: spec,
            organization: clinic.clinicName,
            years: doctor.experienceYears ? `${doctor.experienceYears}+ years` : "",
          },
        ]
      : [],
    clinicName: clinic.clinicName,
    clinicAddress: clinic.clinicAddress,
    clinicCity: clinic.clinicCity,
    clinicPhone: clinic.clinicPhone,
    clinicEmail: BRAND.supportEmail,
    clinicHours: "Mon–Sat · 10:00 AM – 6:00 PM",
    clinicMapUrl: clinic.clinicMapUrl,
    onlineHeadline: `Can't visit the clinic?`,
    onlineDescription: `Book an online consultation with ${name} from anywhere.`,
    onlineEnabled: true,
    physicalEnabled: true,
    topBarEnabled: true,
    whatsappEnabled: false,
    whatsappNumber: "",
    accent: clinic.accent,
    buttonStyle: clinic.buttonStyle,
    heroImageUrl: null,
    ctaPrimaryText: "Book an Appointment",
    ctaSecondaryText: "View Availability",
    ctaBannerHeadline: doctor
      ? `Ready for a visit with ${doctor.fullName}?`
      : "Ready to book your appointment?",
    footerTagline: BRAND.tagline,
    serviceCards: [],
    beforeAfterItems: [],
    sections: DEFAULT_SECTIONS.map((section) => ({ ...section })),
    faqs: defaultFaqs(name),
    socials: [],
    seoTitle: doctor ? `${name} | ${spec} | ${clinic.clinicName}` : "",
    seoDescription: doctor
      ? `Book a physical or online consultation with ${name}, ${spec}. View availability, services, reviews and appointment options.`
      : "",
    ogImageUrl: null,
  };
}

export function isSectionVisible(content: LandingContent, id: LandingSectionId): boolean {
  const match = content.sections.find((section) => section.id === id);
  if (id === "online" && !content.onlineEnabled) return false;
  if (id === "clinic" && !content.physicalEnabled) return false;
  if (id === "results") {
    const hasPairs = content.beforeAfterItems.some(
      (item) => item.beforeUrl.trim() && item.afterUrl.trim(),
    );
    if (!hasPairs) return false;
  }
  return match?.visible ?? id !== "results";
}

export const ACCENT_CLASSES: Record<
  LandingContent["accent"],
  {
    text: string;
    bg: string;
    bgSoft: string;
    border: string;
    button: string;
    hero: string;
    ring: string;
  }
> = {
  teal: {
    text: "text-brand-500",
    bg: "bg-brand-500",
    bgSoft: "bg-brand-50",
    border: "border-brand-200",
    button: "bg-brand-500 hover:bg-brand-600 text-white",
    hero: "from-[#0f142a] via-[#1a3856] to-[#47afa0]",
    ring: "ring-brand-500/30",
  },
  navy: {
    text: "text-brand-900",
    bg: "bg-brand-900",
    bgSoft: "bg-slate-100",
    border: "border-slate-200",
    button: "bg-brand-900 hover:bg-brand-800 text-white",
    hero: "from-[#0b1023] via-[#0f142a] to-[#1a3856]",
    ring: "ring-brand-900/20",
  },
  blue: {
    text: "text-brand-600",
    bg: "bg-brand-600",
    bgSoft: "bg-blue-50",
    border: "border-blue-100",
    button: "bg-brand-600 hover:bg-brand-700 text-white",
    hero: "from-[#0f142a] via-[#406198] to-[#4066ae]",
    ring: "ring-brand-600/30",
  },
  steel: {
    text: "text-brand-800",
    bg: "bg-brand-800",
    bgSoft: "bg-slate-100",
    border: "border-slate-200",
    button: "bg-brand-800 hover:bg-brand-900 text-white",
    hero: "from-[#0b1023] via-[#1a3856] to-[#406198]",
    ring: "ring-brand-800/25",
  },
};
