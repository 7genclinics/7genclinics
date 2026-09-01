/**
 * Public brand identity for the hybrid clinic platform (Pakistan).
 */
export const BRAND = {
  name: "Apna Clinic",
  shortName: "Apna",
  tagline: "Pakistan's best platform for online and physical care",
  description:
    "Pakistan's best platform for online and physical clinic care. Book PMDC verified doctors for video from home, or walk into the clinic for same day tokens and desk billing.",
  supportEmail: "support@apnaclinic.pk",
  phone: "+92 300 1234567",
  citiesLabel: "Lahore, Karachi, Islamabad, Nationwide",
} as const;

export type BrandConfig = typeof BRAND;
