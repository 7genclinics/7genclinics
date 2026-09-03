import type { Metadata } from "next";
import { BRAND } from "@/lib/brand/site";
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
  const ogImage = image || `${SITE_ORIGIN}/apna-clinic-favicon.png`;

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
      images: [{ url: ogImage }],
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
