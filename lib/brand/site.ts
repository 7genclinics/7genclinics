/**
 * Public brand identity for the hybrid clinic platform (Pakistan).
 */
export const BRAND = {
  name: "Apna Clinic",
  shortName: "Apna",
  tagline: "Online care. Clinic care. One place.",
  description:
    "Pakistan’s hybrid clinic — book verified doctors online for video consults or walk into the clinic for same-day care, queue tokens, and desk billing.",
  supportEmail: "support@apnaclinic.pk",
  phone: "+92 300 1234567",
  citiesLabel: "Lahore · Karachi · Islamabad · Nationwide",
} as const;

export type BrandConfig = typeof BRAND;
