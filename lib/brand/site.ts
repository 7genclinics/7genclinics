/**
 * Public brand identity for the hybrid clinic platform (Pakistan).
 */
export const BRAND = {
  name: "Apna Clinic",
  shortName: "Apna",
  domainLabel: "ApnaClinic.pk",
  tagline: "Pakistan's best platform for online and physical care",
  description:
    "Pakistan's best platform for online and physical clinic care. Book PMDC verified doctors for video from home, or walk into the clinic for same day tokens and desk billing.",
  supportEmail: "7genclinics@gmail.com",
  phone: "+92 300 1234567",
  citiesLabel: "Layyah, Chockazam, Fatehpur, Karor, Lahore, Karachi, Islamabad",
} as const;

/** Canonical public asset paths for the ApnaClinic.pk logo system. */
export const BRAND_ASSETS = {
  /** Full logo with wordmark (headers, footers, auth). */
  logo: "/apnaclinic-logo.png",
  /** Square mark for favicon / PWA / browser tab. */
  favicon: "/apnaclinic-favicon.png",
  /** Open Graph / Twitter / Google SERP share image. */
  ogImage: "/og-image.png",
  icon32: "/logo-32.png",
  icon96: "/logo-96.png",
  icon192: "/logo-192.png",
  icon512: "/logo-512.png",
} as const;

export type BrandConfig = typeof BRAND;
