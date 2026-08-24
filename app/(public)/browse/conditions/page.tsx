import { LandingHeader } from "@/components/public/LandingHeader";
import { LandingFooter } from "@/components/public/LandingFooter";
import { ConditionBrowse } from "@/components/public/ConditionBrowse";
import { MENTAL_CONDITIONS } from "@/lib/public/catalog";

export const metadata = {
  title: "Conditions | Wasl Clinic",
  description: "Browse common conditions and connect with a verified specialist at Wasl Clinic.",
};

export default function BrowseConditionsPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <main className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
            Specialties
          </p>
          <ConditionBrowse
            title="All conditions"
            items={MENTAL_CONDITIONS}
            type="condition"
            viewAllHref="/doctors"
          />
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
