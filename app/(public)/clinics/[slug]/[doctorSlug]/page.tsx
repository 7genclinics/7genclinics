import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { DoctorLandingView } from "@/components/landing/DoctorLandingView";
import { getPublicLandingPage } from "@/lib/landing/public";
import { doctorJsonLd } from "@/lib/landing/schema";
import { clinicDoctorPublicPath } from "@/lib/org/paths";
import { doctorPublicPath } from "@/lib/landing/slug";
import { getListedOrganizationBySlugServer } from "@/lib/public/organizations";
import { BRAND } from "@/lib/brand/site";

export const revalidate = 60;

interface NestedDoctorPageProps {
  params: Promise<{ slug: string; doctorSlug: string }>;
  searchParams: Promise<{ book?: string; preview?: string; type?: string }>;
}

export async function generateMetadata({ params, searchParams }: NestedDoctorPageProps): Promise<Metadata> {
  const { slug, doctorSlug } = await params;
  const query = await searchParams;
  const clinic = await getListedOrganizationBySlugServer(slug);
  const result = await getPublicLandingPage(doctorSlug, { preview: query.preview === "1" });
  if (!clinic || result.kind !== "ok" || result.data.organization?.slug !== slug) {
    return { title: `Doctor | ${BRAND.name}` };
  }
  const { doctor, content } = result.data;
  return {
    title: content.seoTitle || `${doctor.fullName} | ${clinic.name} | ${BRAND.name}`,
    description: content.seoDescription || content.shortIntro || `Book ${doctor.fullName} at ${clinic.name}.`,
    alternates: { canonical: clinicDoctorPublicPath(slug, result.data.slug) },
  };
}

export default async function ClinicDoctorPublicPage({ params, searchParams }: NestedDoctorPageProps) {
  const { slug, doctorSlug } = await params;
  const query = await searchParams;
  const clinic = await getListedOrganizationBySlugServer(slug);
  if (!clinic) notFound();

  const result = await getPublicLandingPage(doctorSlug, { preview: query.preview === "1" });
  if (result.kind === "redirect") {
    const qs = new URLSearchParams();
    if (query.preview === "1") qs.set("preview", "1");
    if (query.book === "true") qs.set("book", "true");
    if (query.type) qs.set("type", query.type);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    permanentRedirect(`${clinicDoctorPublicPath(slug, result.slug)}${suffix}`);
  }
  if (result.kind !== "ok" || result.data.organization?.slug !== slug) notFound();

  const jsonLd = doctorJsonLd(result.data, doctorPublicPath(result.data.slug));

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DoctorLandingView data={result.data} />
    </div>
  );
}
