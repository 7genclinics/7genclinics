import { canonicalUrl } from "@/lib/seo/site";
import { BRAND } from "@/lib/brand/site";
import type { PublicLandingPageData } from "./types";

export function doctorJsonLd(data: PublicLandingPageData, pageUrl: string) {
  const { doctor, content, reviews } = data;
  const url = pageUrl.startsWith("http") ? pageUrl : canonicalUrl(pageUrl);
  const address = [content.clinicAddress, content.clinicCity, "Pakistan"]
    .filter(Boolean)
    .join(", ");

  const physician = {
    "@type": "Physician",
    "@id": `${url}#physician`,
    name: doctor.fullName,
    url,
    image: doctor.avatarUrl || undefined,
    description: content.seoDescription || content.shortIntro || doctor.bio || undefined,
    medicalSpecialty: doctor.specialization,
    jobTitle: content.professionalTitle || doctor.specialization,
    identifier: doctor.pmdcNumber
      ? { "@type": "PropertyValue", name: "PMDC", value: doctor.pmdcNumber }
      : undefined,
    availableLanguage: doctor.languages,
    aggregateRating:
      doctor.totalReviews > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: doctor.rating,
            reviewCount: doctor.totalReviews,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
    review: reviews.slice(0, 8).map((item) => ({
      "@type": "Review",
      author: { "@type": "Person", name: item.displayName },
      datePublished: item.createdAt,
      reviewBody: item.comment || undefined,
      reviewRating: {
        "@type": "Rating",
        ratingValue: item.rating,
        bestRating: 5,
        worstRating: 1,
      },
    })),
  };

  const clinic = {
    "@type": "MedicalClinic",
    name: content.clinicName || BRAND.name,
    url,
    telephone: content.clinicPhone || undefined,
    address: address
      ? {
          "@type": "PostalAddress",
          streetAddress: content.clinicAddress || undefined,
          addressLocality: content.clinicCity || undefined,
          addressCountry: "PK",
        }
      : undefined,
    employee: { "@id": `${url}#physician` },
  };

  return {
    "@context": "https://schema.org",
    "@graph": [physician, clinic],
  };
}
