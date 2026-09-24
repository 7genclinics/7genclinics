import type { Metadata } from "next";
import { BRAND, BRAND_ASSETS } from "@/lib/brand/site";
import { SITE_ORIGIN, canonicalUrl } from "@/lib/seo/site";

type PageMetaInput = {
  title: string;
  description: string;
  path: string;
  index?: boolean;
  ogType?: "website" | "profile" | "article";
  image?: string | null;
};

export function pageMetadata({
  title,
  description,
  path,
  index = true,
  ogType = "website",
  image,
}: PageMetaInput): Metadata {
  const url = canonicalUrl(path);
  const ogImage = image
    ? image.startsWith("http")
      ? image
      : `${SITE_ORIGIN}${image}`
    : `${SITE_ORIGIN}${BRAND_ASSETS.ogImage}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: false, nocache: true },
    openGraph: {
      title,
      description,
      url,
      siteName: BRAND.name,
      type: ogType === "profile" ? "profile" : "website",
      locale: "en_PK",
      images: [{ url: ogImage, width: 1200, height: 630, alt: BRAND.domainLabel }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export function privateSectionMetadata(title: string): Metadata {
  return {
    title,
    robots: { index: false, follow: false, nocache: true },
  };
}
