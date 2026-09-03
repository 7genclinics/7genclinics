import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { DoctorLandingView } from "@/components/landing/DoctorLandingView";
import { getPublicLandingPage } from "@/lib/landing/public";
import { doctorJsonLd } from "@/lib/landing/schema";
import { doctorPublicPath } from "@/lib/landing/slug";
import { BRAND } from "@/lib/brand/site";
import { pageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbListJsonLd, canonicalUrl } from "@/lib/seo/site";

export const revalidate = 60;

interface DoctorPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ book?: string; preview?: string; type?: string }>;
}

export async function generateMetadata({ params, searchParams }: DoctorPageProps): Promise<Metadata> {
  const { id } = await params;
  const query = await searchParams;
  const result = await getPublicLandingPage(id, { preview: query.preview === "1" });
  if (result.kind !== "ok") {
    return pageMetadata({
      title: "Doctor",
      description: `Doctor profile on ${BRAND.name}.`,
      path: doctorPublicPath(id),
      index: false,
    });
  }

  const { doctor, content } = result.data;
  const title = content.seoTitle || `${doctor.fullName} | ${doctor.specialization}`;
  const description =
    content.seoDescription ||
    content.shortIntro ||
    `Book a physical or online consultation with ${doctor.fullName}.`;
  const image = content.ogImageUrl || content.heroImageUrl || doctor.avatarUrl || undefined;
  const path = doctorPublicPath(doctor.slug);

  return {
    ...pageMetadata({
      title,
      description,
      path,
      ogType: "profile",
      image,
    }),
    title: { absolute: `${title} | ${BRAND.name}` },
  };
}

export default async function DoctorPublicPage({ params, searchParams }: DoctorPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const result = await getPublicLandingPage(id, { preview: query.preview === "1" });

  if (result.kind === "redirect") {
    const qs = new URLSearchParams();
    if (query.preview === "1") qs.set("preview", "1");
    if (query.book === "true") qs.set("book", "true");
    if (query.type) qs.set("type", query.type);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    permanentRedirect(`${doctorPublicPath(result.slug)}${suffix}`);
  }

  if (result.kind !== "ok") notFound();

  const jsonLd = doctorJsonLd(result.data, canonicalUrl(doctorPublicPath(result.data.slug)));

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      <JsonLd data={jsonLd} />
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: "Doctors", path: "/doctors/" },
          { name: result.data.doctor.fullName, path: doctorPublicPath(result.data.slug) },
        ])}
      />
      <DoctorLandingView data={result.data} />
    </div>
  );
}
