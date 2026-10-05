import Link from "next/link";
import { LandingHeader } from "@/components/public/LandingHeader";
import { LandingFooter } from "@/components/public/LandingFooter";
import { BRAND } from "@/lib/brand/site";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description: `How ${BRAND.name} collects, uses, and protects your personal and health-related information.`,
  path: "/privacy/",
});

const sections: { title: string; body: string }[] = [
  {
    title: "Information we collect",
    body: "We may collect account details (name, email, phone), appointment and payment information, messages between patients and clinics, and technical data such as device type and log data needed to operate the service securely.",
  },
  {
    title: "How we use information",
    body: "We use your information to book and manage appointments, run online consultations, process payments, send service notifications you opt into, improve the platform, and comply with applicable law and professional obligations.",
  },
  {
    title: "Sharing",
    body: "We share information with the doctors and clinics you choose, payment providers where required for transactions, and trusted service providers who help us host and secure the platform. We do not sell your personal data.",
  },
  {
    title: "Security and retention",
    body: "We use reasonable technical and organisational measures to protect data. We retain information only as long as needed for care, billing, legal, or operational purposes.",
  },
  {
    title: "Your choices",
    body: "You may update profile details in your account where available, manage notification preferences, and contact us to ask about access or correction of your information.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white text-brand-950">
      <LandingHeader />
      <main className="py-16 sm:py-20">
        <article className="mx-auto max-w-3xl px-4 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            Legal
          </p>
          <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm text-slate-600">Last updated: {new Date().getFullYear()}</p>

          <p className="mt-10 text-sm leading-relaxed text-slate-600">
            {BRAND.name} ({BRAND.domainLabel}) provides online and in-clinic healthcare services in
            Pakistan. This policy explains how we handle information when you use our website,
            mobile experience, and clinic tools.
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
                Questions about this policy:{" "}
                <a href={`mailto:${BRAND.supportEmail}`} className="text-brand-600 hover:underline">
                  {BRAND.supportEmail}
                </a>{" "}
                or {BRAND.phone}.
              </p>
            </section>
          </div>

          <p className="mt-10 text-sm text-slate-500">
            See also our{" "}
            <Link href="/legal/" className="font-medium text-brand-600 hover:underline">
              Legal
            </Link>{" "}
            page for terms of use.
          </p>
        </article>
      </main>
      <LandingFooter />
    </div>
  );
}
