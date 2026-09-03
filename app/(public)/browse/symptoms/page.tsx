import { LandingHeader } from "@/components/public/LandingHeader";
import { LandingFooter } from "@/components/public/LandingFooter";
import { ConditionBrowse } from "@/components/public/ConditionBrowse";
import { MENTAL_SYMPTOMS } from "@/lib/public/catalog";
import { pageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbListJsonLd } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Symptoms",
  description: "Browse common symptoms and find a PMDC-verified specialist at Apna Clinic.",
  path: "/browse/symptoms/",
});

export default function BrowseSymptomsPage() {
  return (
    <div className="min-h-screen bg-white">
      <JsonLd
        data={breadcrumbListJsonLd([{ name: "Symptoms", path: "/browse/symptoms/" }])}
      />
      <LandingHeader />
      <main className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            Specialties
          </p>
          <ConditionBrowse
            title="All symptoms"
            items={MENTAL_SYMPTOMS}
            type="symptom"
            viewAllHref="/doctors/"
          />
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
