import Link from "next/link";
import { LandingHeader } from "@/components/public/LandingHeader";
import { LandingFooter } from "@/components/public/LandingFooter";
import { BRAND } from "@/lib/brand/site";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Legal",
  description: `Terms of use and legal information for ${BRAND.name} in Pakistan.`,
  path: "/legal/",
});

const sections: { title: string; body: string }[] = [
  {
    title: "Medical services",
    body: `${BRAND.name} helps you discover and book care with participating clinicians and clinics. Online consultations and in-person visits are provided by licensed professionals; ${BRAND.name} is a technology platform, not a substitute for emergency care. In an emergency, contact local emergency services immediately.`,
  },
  {
    title: "Accounts and eligibility",
    body: "You must provide accurate registration information and keep your credentials secure. Doctors and clinic staff must maintain valid credentials and comply with applicable medical regulations in Pakistan.",
  },
  {
    title: "Payments",
    body: "Fees, refunds, and payment methods are shown at booking or at the clinic desk as applicable. You are responsible for charges you authorise unless otherwise stated in a clinic policy or required by law.",
  },
  {
    title: "Acceptable use",
    body: "You may not misuse the platform, attempt unauthorised access, upload unlawful content, or interfere with other users or clinic operations.",
  },
  {
    title: "Limitation of liability",
    body: `To the fullest extent permitted by law, ${BRAND.name} is not liable for indirect or consequential damages arising from use of the platform. Clinical decisions remain the responsibility of treating professionals.`,
  },
  {
    title: "Changes",
    body: "We may update these terms from time to time. Continued use after changes constitutes acceptance of the updated terms.",
  },
];

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-white text-brand-950">
      <LandingHeader />
      <main className="py-16 sm:py-20">
        <article className="mx-auto max-w-3xl px-4 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            Legal
          </p>
          <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Legal &amp; Terms of Use
          </h1>
          <p className="mt-4 text-sm text-slate-600">Last updated: {new Date().getFullYear()}</p>

          <p className="mt-10 text-sm leading-relaxed text-slate-600">
            By using {BRAND.name} ({BRAND.domainLabel}), you agree to these terms. If you do not
            agree, please do not use the service.
          </p>

          <div className="mt-8 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="font-heading text-lg font-semibold tracking-tight text-brand-950">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{section.body}</p>
              </section>
            ))}

            <section>
              <h2 className="font-heading text-lg font-semibold tracking-tight text-brand-950">
                Contact
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Legal or general enquiries:{" "}
                <a href={`mailto:${BRAND.supportEmail}`} className="text-brand-600 hover:underline">
                  {BRAND.supportEmail}
                </a>{" "}
                · {BRAND.phone}
              </p>
            </section>
          </div>

          <p className="mt-10 text-sm text-slate-500">
            See our{" "}
            <Link href="/privacy/" className="font-medium text-brand-600 hover:underline">
              Privacy Policy
            </Link>{" "}
            for how we handle personal data.
          </p>
        </article>
      </main>
      <LandingFooter />
    </div>
  );
}
