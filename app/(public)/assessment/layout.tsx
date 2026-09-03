import { pageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbListJsonLd } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Self assessment",
  description:
    "Answer a short screening about sleep, mood, stress, or focus, then book the right specialist on Apna Clinic.",
  path: "/assessment/",
});

export default function AssessmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={breadcrumbListJsonLd([{ name: "Self assessment", path: "/assessment/" }])}
      />
      {children}
    </>
  );
}
