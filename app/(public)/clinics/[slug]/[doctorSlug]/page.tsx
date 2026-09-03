import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { DoctorLandingView } from "@/components/landing/DoctorLandingView";
import { getPublicLandingPage } from "@/lib/landing/public";
import { doctorJsonLd } from "@/lib/landing/schema";
import { clinicDoctorPublicPath, clinicPublicPath } from "@/lib/org/paths";
import { getListedOrganizationBySlugServer } from "@/lib/public/organizations";
import { BRAND } from "@/lib/brand/site";
import { pageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbListJsonLd, canonicalUrl } from "@/lib/seo/site";

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
    return pageMetadata({
      title: "Doctor",
      description: `Doctor profile on ${BRAND.name}.`,
      path: clinicDoctorPublicPath(slug, doctorSlug),
      index: false,
    });
  }
  const { doctor, content } = result.data;
  const title = content.seoTitle || `${doctor.fullName} | ${clinic.name}`;
  const description =
    content.seoDescription || content.shortIntro || `Book ${doctor.fullName} at ${clinic.name}.`;
  return {
    ...pageMetadata({
      title,
      description,
      path: clinicDoctorPublicPath(slug, result.data.slug),
      ogType: "profile",
    }),
    title: { absolute: `${title} | ${BRAND.name}` },
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

  const pagePath = clinicDoctorPublicPath(slug, result.data.slug);
  const jsonLd = doctorJsonLd(result.data, canonicalUrl(pagePath));

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      <JsonLd data={jsonLd} />
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: "Clinics", path: "/clinics/" },
          { name: clinic.name, path: clinicPublicPath(slug) },
          { name: result.data.doctor.fullName, path: pagePath },
        ])}
      />
      <DoctorLandingView data={result.data} />
    </div>
  );
}
