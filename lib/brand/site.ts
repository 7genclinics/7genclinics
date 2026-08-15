/**
 * Public brand identity for the hybrid clinic platform (Pakistan).
 * "Wasl" (وصل) means connection / joining — online care linked with the physical clinic.
 */
export const BRAND = {
  name: "Wasl Clinic",
  shortName: "Wasl",
  tagline: "Online care. Clinic care. One place.",
  description:
    "Pakistan’s hybrid clinic — book verified doctors online for video consults or walk into the clinic for same-day care, queue tokens, and desk billing.",
  supportEmail: "support@waslclinic.pk",
  phone: "+92 300 1234567",
  citiesLabel: "Lahore · Karachi · Islamabad · Nationwide",
} as const;

export type BrandConfig = typeof BRAND;
